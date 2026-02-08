
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
    // Parse line by line to capture comments
    const lines = jsonWithComments.split('\n');
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

      // Update current path based on indentation and braces
      this.updateCurrentPath(cleanLine, currentPath);

      // Extract field name if this line contains a field
      const fieldName = this.extractFieldName(cleanLine);
      if (fieldName && comment) {
        const fullPath = [...currentPath, fieldName].join('.');
        fieldComments.set(fullPath, comment);
      }

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
   * Update current JSON path based on line content
   */
  private updateCurrentPath(line: string, currentPath: string[]): void {
    const trimmed = line.trim();
    
    // Check for array items
    const arrayItemMatch = trimmed.match(/^\d+:|\d+,$/);
    if (arrayItemMatch) {
      const lastSegment = currentPath[currentPath.length - 1];
      if (lastSegment && !lastSegment.includes('[')) {
        currentPath[currentPath.length - 1] = `${lastSegment}[]`;
      }
      return;
    }

    // Check for object start/end
    if (trimmed.endsWith('{')) {
      const fieldName = this.extractFieldName(line);
      if (fieldName) {
        currentPath.push(fieldName);
      }
    } else if (trimmed.endsWith('}') || trimmed.endsWith('},')) {
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

export { extractJsonWithMetadata, JsonWithCommentsExtractor };
export type { ExtractionResult, FieldMetadata };