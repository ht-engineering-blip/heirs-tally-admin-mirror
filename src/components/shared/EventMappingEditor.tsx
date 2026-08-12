"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { getAdminApiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronsUpDown,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ===== Types =====

export interface EventMapping {
  routeId?: string;
  event: string;
  actions: string[];
  enabled: boolean;
  description?: string;
}

interface EventTypeOption {
  value: string;
  label: string;
  description: string;
  category?: string;
  direction?: string;
}

interface WorkflowOption {
  value: string;
  label: string;
  description: string;
  category?: string;
  order?: number;
}

// ===== Module-level cache =====
// Populated only from a successful API response — there are no hardcoded
// fallback event types/workflows/mappings. If the reference-data fetch
// fails, callers see an explicit error + retry instead of stale defaults.

let cachedEventTypes: EventTypeOption[] | null = null;
let cachedWorkflows: WorkflowOption[] | null = null;

// ===== Helpers =====

export const getEventLabel = (value: string) =>
  cachedEventTypes?.find((e) => e.value === value)?.label || value;

export const getWorkflowLabel = (value: string) =>
  cachedWorkflows?.find((w) => w.value === value)?.label || value;

// ===== Shared empty/error state for combobox dropdowns =====

function ComboboxEmptyState({
  error,
  onRetry,
  emptyMessage,
}: {
  error?: string;
  onRetry?: () => void;
  emptyMessage: string;
}) {
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 px-2 text-center">
        <AlertCircle className="w-5 h-5 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        )}
      </div>
    );
  }
  return <span className="py-2 block text-center">{emptyMessage}</span>;
}

// ===== Searchable Combobox =====

interface SearchableSelectProps {
  value: string;
  onSelect: (value: string) => void;
  options: {
    value: string;
    label: string;
    description?: string;
    category?: string;
  }[];
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

function SearchableSelect({
  value,
  onSelect,
  options,
  placeholder,
  disabled,
  loading,
  error,
  onRetry,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label;

  // Group options by category if categories exist
  const hasCategories = options.some((o) => o.category);
  const grouped = hasCategories
    ? options.reduce<Record<string, typeof options>>((acc, o) => {
        const cat = o.category || "Other";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(o);
        return acc;
      }, {})
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className="w-full justify-between font-normal h-10"
        >
          <span className="truncate">
            {loading
              ? "Loading..."
              : error && options.length === 0
                ? "Failed to load"
                : selectedLabel || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput
            placeholder={`Search ${placeholder.toLowerCase().replace("select ", "")}...`}
          />
          <CommandList>
            <CommandEmpty>
              <ComboboxEmptyState
                error={error}
                onRetry={onRetry}
                emptyMessage="No results found."
              />
            </CommandEmpty>
            {grouped ? (
              Object.entries(grouped).map(([category, items]) => (
                <CommandGroup
                  key={category}
                  heading={category.charAt(0).toUpperCase() + category.slice(1)}
                >
                  {items.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.value}`}
                      onSelect={() => {
                        onSelect(option.value);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.value ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="flex-1 min-w-0 group/item">
                        <span className="text-sm">{option.label}</span>
                        {option.description && (
                          <p
                            className="text-xs text-muted-foreground truncate group-hover/item:whitespace-normal group-hover/item:overflow-visible"
                            title={option.description}
                          >
                            {option.description}
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))
            ) : (
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.value}`}
                    onSelect={() => {
                      onSelect(option.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex-1 min-w-0 group/item">
                      <span className="text-sm">{option.label}</span>
                      {option.description && (
                        <p
                          className="text-xs text-muted-foreground truncate group-hover/item:whitespace-normal group-hover/item:overflow-visible"
                          title={option.description}
                        >
                          {option.description}
                        </p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ===== Multi-select Actions Combobox =====

interface MultiActionSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: {
    value: string;
    label: string;
    description?: string;
    category?: string;
  }[];
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

function MultiActionSelect({
  values,
  onChange,
  options,
  placeholder,
  disabled,
  loading,
  error,
  onRetry,
}: MultiActionSelectProps) {
  const [open, setOpen] = useState(false);

  const sortByOrder = (vals: string[]) => {
    return [...vals].sort((a, b) => {
      const orderA =
        (options as WorkflowOption[]).find((o) => o.value === a)?.order ??
        Infinity;
      const orderB =
        (options as WorkflowOption[]).find((o) => o.value === b)?.order ??
        Infinity;
      return orderA - orderB;
    });
  };

  const toggleAction = (actionValue: string) => {
    if (values.includes(actionValue)) {
      onChange(values.filter((v) => v !== actionValue));
    } else {
      onChange(sortByOrder([...values, actionValue]));
    }
  };

  const removeAction = (actionValue: string) => {
    onChange(values.filter((v) => v !== actionValue));
  };

  const hasCategories = options.some((o) => o.category);
  const grouped = hasCategories
    ? options.reduce<Record<string, typeof options>>((acc, o) => {
        const cat = o.category || "Other";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(o);
        return acc;
      }, {})
    : null;

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || loading}
            className="w-full justify-between font-normal h-10"
          >
            <span className="truncate">
              {loading
                ? "Loading..."
                : error && options.length === 0
                  ? "Failed to load"
                  : values.length > 0
                    ? `${values.length} action${values.length !== 1 ? "s" : ""} selected`
                    : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search actions..." />
            <CommandList>
              <CommandEmpty>
                <ComboboxEmptyState
                  error={error}
                  onRetry={onRetry}
                  emptyMessage="No actions found."
                />
              </CommandEmpty>
              {grouped ? (
                Object.entries(grouped).map(([category, items]) => (
                  <CommandGroup
                    key={category}
                    heading={
                      category.charAt(0).toUpperCase() + category.slice(1)
                    }
                  >
                    {items.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={`${option.label} ${option.value}`}
                        onSelect={() => toggleAction(option.value)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            values.includes(option.value)
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <div className="flex-1 min-w-0 group/item">
                          <span className="text-sm">{option.label}</span>
                          {option.description && (
                            <p
                              className="text-xs text-muted-foreground truncate group-hover/item:whitespace-normal group-hover/item:overflow-visible"
                              title={option.description}
                            >
                              {option.description}
                            </p>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))
              ) : (
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.value}`}
                      onSelect={() => toggleAction(option.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          values.includes(option.value)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <div className="flex-1 min-w-0 group/item">
                        <span className="text-sm">{option.label}</span>
                        {option.description && (
                          <p
                            className="text-xs text-muted-foreground truncate group-hover/item:whitespace-normal group-hover/item:overflow-visible"
                            title={option.description}
                          >
                            {option.description}
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {values.length > 0 && !disabled && (
        <div className="flex flex-wrap gap-1">
          {values.map((v, idx) => {
            const strVal = typeof v === "string" ? v : String(v);
            const label =
              options.find((o) => o.value === strVal)?.label || strVal;
            return (
              <Badge
                key={`${strVal}-${idx}`}
                variant="secondary"
                className="text-xs py-0.5 pr-1"
              >
                {label}
                <button
                  onClick={() => removeAction(strVal)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===== Component =====

interface EventMappingEditorProps {
  mappings: EventMapping[];
  onChange: (mappings: EventMapping[]) => void;
  savedMappings?: EventMapping[];
  readOnly?: boolean;
  showSummary?: boolean;
  /** Called when a saved route (with routeId) is deleted via trash icon. Parent should call DELETE /routes/{routeId}. */
  onDeleteRoute?: (routeId: string) => Promise<void>;
}

export function EventMappingEditor({
  mappings,
  onChange,
  savedMappings,
  readOnly = false,
  showSummary = true,
  onDeleteRoute,
}: EventMappingEditorProps) {
  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>(
    cachedEventTypes || [],
  );
  const [workflows, setWorkflows] = useState<WorkflowOption[]>(
    cachedWorkflows || [],
  );
  const [loading, setLoading] = useState(!cachedEventTypes || !cachedWorkflows);
  const [eventsError, setEventsError] = useState<string | undefined>();
  const [workflowsError, setWorkflowsError] = useState<string | undefined>();
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchReferenceData = useCallback(async () => {
    setLoading(true);
    setEventsError(undefined);
    setWorkflowsError(undefined);
    try {
      const api = getAdminApiClient();

      const [eventsRes, workflowsRes] = await Promise.all([
        (api as any).v1.admin.config.reference.events.get(),
        (api as any).v1.admin.config.reference["workflow-actions"].get(),
      ]);

      if (!eventsRes.error && eventsRes.data?.data?.events) {
        const mapped: EventTypeOption[] = eventsRes.data.data.events.map(
          (e: any) => ({
            value: e.id,
            label: e.name,
            description: e.description || "",
            category: e.category,
            direction: e.direction,
          }),
        );
        cachedEventTypes = mapped;
        setEventTypes(mapped);
      } else {
        setEventsError(
          (eventsRes.error as any)?.value?.error || "Failed to load event types.",
        );
      }

      if (!workflowsRes.error && workflowsRes.data?.data?.actions) {
        const mapped: WorkflowOption[] = workflowsRes.data.data.actions.map(
          (a: any) => ({
            value: a.id,
            label: a.name,
            description: a.description || "",
            category: a.category,
            order: a.order ?? 0,
          }),
        );
        cachedWorkflows = mapped;
        setWorkflows(mapped);
      } else {
        setWorkflowsError(
          (workflowsRes.error as any)?.value?.error || "Failed to load actions.",
        );
      }
    } catch (error: any) {
      setEventsError(error?.message || "Failed to load event types.");
      setWorkflowsError(error?.message || "Failed to load actions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cachedEventTypes && cachedWorkflows) return;
    fetchReferenceData();
  }, [fetchReferenceData]);

  const addMapping = () => {
    onChange([...mappings, { event: "", actions: [], enabled: true }]);
  };

  const updateMapping = (
    index: number,
    field: keyof EventMapping,
    value: any,
  ) => {
    const updated = [...mappings];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeMapping = (index: number) => {
    onChange(mappings.filter((_, i) => i !== index));
  };

  const handleConfirmDelete = async () => {
    if (deleteIndex === null) return;

    const mapping = mappings[deleteIndex];

    // If the route is already saved on the server (has routeId), call the API to delete it
    if (mapping.routeId && onDeleteRoute) {
      setDeleting(true);
      try {
        await onDeleteRoute(mapping.routeId);
      } catch {
        setDeleting(false);
        setDeleteIndex(null);
        return;
      }
      setDeleting(false);
    }

    // Remove from local state
    removeMapping(deleteIndex);
    setDeleteIndex(null);
  };

  const resolveEventId = (value: any): string =>
    typeof value === "object" && value !== null
      ? value.id || value.value || String(value)
      : String(value || "");

  const resolveActionId = (value: any): string =>
    typeof value === "object" && value !== null
      ? value.id || value.value || String(value)
      : String(value || "");

  const localGetEventLabel = (value: any) => {
    const id = resolveEventId(value);
    if (typeof value === "object" && value?.name) return value.name;
    return eventTypes.find((e) => e.value === id)?.label || id;
  };

  const localGetWorkflowLabel = (value: any) => {
    const id = resolveActionId(value);
    if (typeof value === "object" && value?.name) return value.name;
    return workflows.find((w) => w.value === id)?.label || id;
  };

  // Active routes summary uses savedMappings if provided, otherwise falls back to current mappings
  const summarySource = savedMappings ?? mappings;
  const activeRoutes = summarySource.filter(
    (m) => m.event && m.actions.length > 0 && m.enabled,
  );

  return (
    <div>
      {mappings.length === 0 ? (
        <div className="text-center py-8">
          <ArrowRight className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No event mappings configured.
            {!readOnly &&
              " Add a mapping to route incoming events to workflows."}
          </p>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={addMapping}
              className="mt-3"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Mapping
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Column headers (desktop only) */}
          <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr_auto_auto] gap-3 items-center text-xs font-medium text-muted-foreground px-1">
            <span>Event Type</span>
            <span></span>
            <span>Route to Action(s)</span>
            <span>Active</span>
            <span></span>
          </div>

          {/* Mapping rows */}
          {mappings.map((mapping, index) => (
            <div
              key={mapping.routeId || index}
              className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_auto] gap-3 items-center p-3 rounded-lg border bg-card"
            >
              <div className="space-y-1">
                <SearchableSelect
                  value={mapping.event}
                  onSelect={(val) => updateMapping(index, "event", val)}
                  options={eventTypes}
                  placeholder="Select event..."
                  disabled={readOnly}
                  loading={loading}
                  error={eventsError}
                  onRetry={fetchReferenceData}
                />
                {/* Copy Event */}
                <div>
                  <p className="text-sm flex items-center gap-1">
                    <span className="font-bold">Event Type: </span>
                    <span>{mapping.event}</span>
                    {mapping.event && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(mapping.event)
                          toast.success('Event type copied!')
                        }}
                        className="inline-flex items-center justify-center rounded p-0.5 hover:bg-muted transition-colors"
                        title="Copy event type"
                      >
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </p>
                </div>
              </div>

              <div className="hidden md:flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>

              <MultiActionSelect
                values={mapping.actions}
                onChange={(val) => updateMapping(index, "actions", val)}
                options={workflows}
                placeholder="Select actions..."
                disabled={readOnly}
                loading={loading}
                error={workflowsError}
                onRetry={fetchReferenceData}
              />

              <div className="flex items-center justify-center">
                <Switch
                  checked={mapping.enabled}
                  onCheckedChange={(val) =>
                    updateMapping(index, "enabled", val)
                  }
                  disabled={readOnly}
                />
              </div>

              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteIndex(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}

          {/* Add mapping button */}
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={addMapping}>
              <Plus className="w-4 h-4 mr-2" />
              Add Mapping
            </Button>
          )}
        </div>
      )}

      {/* Active routes summary — shows saved mappings only */}
      {showSummary && activeRoutes.length > 0 && (
        <>
          <Separator className="my-4" />
          <div>
            <p className="text-sm font-medium mb-3">Active Routes Summary</p>
            <div className="flex flex-wrap gap-2">
              {activeRoutes.map((m, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-xs py-1 px-3"
                >
                  {localGetEventLabel(m.event)} →{" "}
                  {m.actions.map((a) => localGetWorkflowLabel(a)).join(", ")}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteIndex !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteIndex(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Event Route</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this event route
              {deleteIndex !== null && mappings[deleteIndex]?.event
                ? ` (${localGetEventLabel(mappings[deleteIndex].event)})`
                : ""}
              ?
              {deleteIndex !== null && mappings[deleteIndex]?.routeId
                ? " This will permanently delete the route from the server."
                : " This change will take effect when you save."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
