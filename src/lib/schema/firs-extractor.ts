
/**
 * Extracts JSON payload and metadata from JSON string with comments
 */
interface FieldMetadata {
  required: boolean;
  description: string;
  category: string;
}

interface ExtractionResult {
  invoice: Record<string, any>;
  metadata: {
    field_documentation: Record<string, FieldMetadata>;
    schema_info: {
      version: string;
      generated_at: string;
    };
  };
}

/**
 * Escapes raw control characters (unescaped newlines, tabs, etc.) found
 * inside JSON string literals. Real-world pasted payloads sometimes contain
 * these — e.g. a copy-pasted multi-line address/note field whose newline
 * was never escaped to `\n` — which JSON.parse rejects outright per the
 * JSON spec ("Bad control character in string literal"). This repairs them
 * in place, respecting string boundaries and existing escape sequences, so
 * the payload becomes parseable instead of throwing.
 */
function escapeControlCharsInStrings(json: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    const code = json.charCodeAt(i);

    if (inString) {
      if (escaped) {
        result += ch;
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        result += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
        result += ch;
        continue;
      }
      if (code < 0x20) {
        switch (ch) {
          case '\n': result += '\\n'; break;
          case '\r': result += '\\r'; break;
          case '\t': result += '\\t'; break;
          case '\b': result += '\\b'; break;
          case '\f': result += '\\f'; break;
          default: result += '\\u' + code.toString(16).padStart(4, '0');
        }
        continue;
      }
      result += ch;
    } else {
      if (ch === '"') {
        inString = true;
      }
      result += ch;
    }
  }

  return result;
}

/**
 * Strips `//` and `/* *​/` comments from a JSON string (respecting block
 * comments spanning multiple lines) without parsing it — used to make a
 * single JSON.parse call tolerant of comments, independent of the fuller
 * invoice/metadata extraction below. Returns the input unchanged if it's
 * already valid JSON (fast path) or contains no recognizable comments.
 */
function stripJsonComments(jsonWithComments: string): string {
  const sanitized = escapeControlCharsInStrings(jsonWithComments);

  try {
    JSON.parse(sanitized);
    return sanitized;
  } catch {
    // may genuinely contain comments — fall through to strip them
  }

  const lines = sanitized.split('\n');
  const cleanLines: string[] = [];
  let inBlockComment = false;

  for (let line of lines) {
    if (inBlockComment) {
      const endBlockIndex = line.indexOf('*/');
      if (endBlockIndex !== -1) {
        line = line.substring(endBlockIndex + 2);
        inBlockComment = false;
      } else {
        continue;
      }
    }

    const blockCommentStart = line.indexOf('/*');
    if (blockCommentStart !== -1) {
      const blockCommentEnd = line.indexOf('*/', blockCommentStart);
      if (blockCommentEnd !== -1) {
        line = line.substring(0, blockCommentStart) + line.substring(blockCommentEnd + 2);
      } else {
        line = line.substring(0, blockCommentStart);
        inBlockComment = true;
      }
    }

    const lineCommentIndex = line.indexOf('//');
    const cleanLine = lineCommentIndex !== -1 ? line.substring(0, lineCommentIndex).trim() : line;

    if (cleanLine.trim()) {
      cleanLines.push(cleanLine);
    }
  }

  return cleanLines.join('\n');
}

class JsonWithCommentsExtractor {
  private readonly categoryMap: Record<string, string> = {
    // Field name patterns to categories
    'id$|_id$|number$|code$': 'invoice_identification',
    'date$|time$': 'invoice_dates',
    'amount$|total$|price$|currency$|tax$|fee$|discount$': 'financial',
    'customer$|supplier$|party$|tin$|email$|phone$|telephone$|address$': 'party_info',
    'line$|item$|product$|quantity$|hsn$|sku$': 'line_items',
    'payment$|status$|terms$': 'payment',
    'reference$|irn$|order$': 'references',
    'delivery$|dispatch$|ship$': 'delivery',
    'note$|description$|comment$': 'miscellaneous'
  };

  /**
   * Extract clean JSON and metadata from JSON with comments
   */
  extract(jsonWithComments: string): ExtractionResult {
    const sanitized = escapeControlCharsInStrings(jsonWithComments);

    // Fast path: most real-world payloads (e.g. a pasted invoice) have no
    // comments at all. Parse them directly rather than running every
    // payload through the line-based comment stripper below, which can't
    // distinguish a `//` inside a string (e.g. a URL) from a real comment.
    try {
      const invoice = JSON.parse(sanitized);
      return {
        invoice,
        metadata: {
          field_documentation: {},
          schema_info: {
            version: '1.0',
            generated_at: new Date().toISOString(),
          },
        },
      };
    } catch {
      // Not plain JSON — may genuinely contain // or /* */ comments (a
      // hand-authored schema definition). Fall through to the comment-aware
      // parser below.
    }

    // Parse line by line to capture comments
    const lines = sanitized.split('\n');
    const cleanLines: string[] = [];
    const fieldComments = new Map<string, string>();
    let currentPath: string[] = [];
    let inBlockComment = false;

    for (let line of lines) {
      // Handle block comments
      if (inBlockComment) {
        const endBlockIndex = line.indexOf('*/');
        if (endBlockIndex !== -1) {
          line = line.substring(endBlockIndex + 2);
          inBlockComment = false;
        } else {
          continue; // Skip entire line if still in block comment
        }
      }

      // Remove block comments
      const blockCommentStart = line.indexOf('/*');
      if (blockCommentStart !== -1) {
        const blockCommentEnd = line.indexOf('*/', blockCommentStart);
        if (blockCommentEnd !== -1) {
          line = line.substring(0, blockCommentStart) + line.substring(blockCommentEnd + 2);
        } else {
          line = line.substring(0, blockCommentStart);
          inBlockComment = true;
        }
      }

      // Extract line comments and field information
      const lineCommentIndex = line.indexOf('//');
      let comment = '';
      let cleanLine = line;

      if (lineCommentIndex !== -1) {
        comment = line.substring(lineCommentIndex + 2).trim();
        cleanLine = line.substring(0, lineCommentIndex).trim();
      }

      // A multi-line object/array's own `//optional` comment almost always
      // sits on its CLOSING `}`/`],` line, not on the `"key": {`/`[` line
      // that opens it — extractFieldName finds nothing on a bare closing
      // bracket, so that comment used to be silently dropped, and the whole
      // field (plus everything under it) came back missing from
      // field_documentation entirely. Attribute it back to the field being
      // closed instead, using currentPath as it stands right before the pop
      // below. Guarded to only fire when currentPath's own top is a real
      // (named) field — not a placeholder for an anonymous array-item
      // object — so a comment on an individual array item's closing brace
      // (e.g. "second value in array is always optional") doesn't get
      // misattributed to the array field itself.
      const trimmedClean = cleanLine.trim();
      const isClosingLine = /^[}\]],?$/.test(trimmedClean);
      const topIsNamedField = currentPath.length > 0 && currentPath[currentPath.length - 1] !== '';

      if (isClosingLine) {
        if (comment && topIsNamedField) {
          const fullPath = currentPath.filter(Boolean).join('.');
          if (fullPath) {
            fieldComments.set(fullPath, comment);
          }
        }
      } else {
        // Extract field name if this line contains a field
        const fieldName = this.extractFieldName(cleanLine);
        if (fieldName && comment) {
          const fullPath = [...currentPath, fieldName].filter(Boolean).join('.');
          fieldComments.set(fullPath, comment);
        }
      }

      // Update current path based on braces — after the comment handling
      // above, since a closing line needs currentPath as it stood BEFORE
      // the pop, and an opening line with its own inline comment (rare)
      // needs it as it stood BEFORE the push.
      this.updateCurrentPath(cleanLine, currentPath);

      if (cleanLine.trim()) {
        cleanLines.push(cleanLine);
      }
    }

    // Parse clean JSON
    const cleanJson = cleanLines.join('\n');
    const invoice = JSON.parse(cleanJson);

    // Generate metadata
    const fieldDocumentation: Record<string, FieldMetadata> = {};
    
    for (const [path, comment] of Array.from(fieldComments.entries())) {
      fieldDocumentation[path] = {
        required: !comment.toLowerCase().includes('optional'),
        description: this.cleanDescription(comment),
        category: this.determineCategory(path)
      };
    }

    return {
      invoice,
      metadata: {
        field_documentation: fieldDocumentation,
        schema_info: {
          version: '1.0',
          generated_at: new Date().toISOString()
        }
      }
    };
  }

  /**
   * Update current JSON path based on line content. Tracks into both object
   * ({) and array ([) blocks — pushing the field name that opened a named
   * block, or an empty-string placeholder for an anonymous array-item
   * object/array (e.g. each `{` inside `"billing_reference": [ {...}, {...} ]`)
   * so every open has a matching pop and depth never drifts. Placeholders
   * are stripped out (via .filter(Boolean)) wherever a path is built into a
   * string, so they never show up in an actual field path.
   */
  private updateCurrentPath(line: string, currentPath: string[]): void {
    const trimmed = line.trim();

    if (trimmed.endsWith('{') || trimmed.endsWith('[')) {
      const fieldName = this.extractFieldName(line);
      currentPath.push(fieldName || '');
    } else if (/^[}\]],?$/.test(trimmed)) {
      currentPath.pop();
    }
  }

  /**
   * Extract field name from a line
   */
  private extractFieldName(line: string): string | null {
    const fieldMatch = line.match(/"([^"]+)":/);
    if (fieldMatch) {
      return fieldMatch[1];
    }
    
    const unquotedMatch = line.match(/(\w+):/);
    if (unquotedMatch) {
      return unquotedMatch[1];
    }
    
    return null;
  }

  /**
   * Clean description text
   */
  private cleanDescription(comment: string): string {
    return comment
      .replace(/^\s*(optional|mandatory|required|defaults to[^,]*),\s*/i, '')
      .replace(/\s+\([^)]*\)$/, '') // Remove trailing parenthetical
      .trim();
  }

  /**
   * Determine category based on field path
   */
  private determineCategory(path: string): string {
    const fieldName = path.split('.').pop() || '';
    
    for (const [pattern, category] of Object.entries(this.categoryMap)) {
      if (new RegExp(pattern, 'i').test(fieldName)) {
        return category;
      }
    }
    
    return 'miscellaneous';
  }

  /**
   * Convert result to JSON string
   */
  toJsonString(result: ExtractionResult): string {
    return JSON.stringify(result, null, 2);
  }
}
 
 
function extractJsonWithMetadata(jsonWithComments: string): ExtractionResult {
    try {
        const extractor = new JsonWithCommentsExtractor();
        return extractor.extract(jsonWithComments);
    } catch (error) {
        console.error('Error extracting JSON:', error);
        return {
            invoice: {},
            metadata: {
                field_documentation: {},
                schema_info: {
                    version: '1.0',
                    generated_at: new Date().toISOString()
                }
            }
        };
    }
}

export { extractJsonWithMetadata, JsonWithCommentsExtractor, stripJsonComments };
export type { ExtractionResult, FieldMetadata };