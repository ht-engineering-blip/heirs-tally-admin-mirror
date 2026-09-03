"use client";

import {
  Column,
  DataTable,
  EventMappingEditor,
  InvoiceIdKeyEditor,
  JsonBlock,
  KeyValueTable,
  stringifyJson,
  StatusBadge,
  WebhookExpiryBadge,
  type EventMapping,
} from "@/components/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  createTenantWebhookListener,
  getAdminApiClient,
} from "@/lib/api/client";
import { createTenantApi } from "@/lib/api/tenant-api";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Copy,
  Eye,
  FileJson,
  Key,
  Link2,
  Loader2,
  Lock,
  Radio,
  RefreshCw,
  Server,
  Settings2,
  StopCircle,
  Trash2,
  Unlink,
  Webhook,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SectionLoader } from "@/components/shared/SectionLoader";
import { usePermissions } from "@/hooks/use-permissions";
import { usePersistedTab } from "@/hooks/use-persisted-tab";
import { useTenant } from "@/hooks/use-tenant";
import { getTenantApiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

import { stripTrailingSlash } from "@/lib/helpers";

const CREDIT_NOTE_EVENT_TYPE = "erp.creditnote.issued";

// ===== Types =====

interface WebhookConfig {
  webhookUrl: string;
  webhookSecret: string;
  webhookPath: string;
  webhookEnabled: boolean;
}

interface WebhookStatus {
  configured: boolean;
  webhookUrl: string | null;
  webhookPath: string | null;
  webhookEnabled: boolean;
  invoiceIdKey: string | null;
  lifespan: string | null;
  expiresAt: string | null;
  isExpired: boolean;
  hasSecret: boolean;
  remainingDays: number | null;
}

const LIFESPAN_OPTIONS = [
  { value: "30_DAYS", label: "30 Days" },
  { value: "90_DAYS", label: "90 Days" },
  { value: "180_DAYS", label: "180 Days" },
  { value: "1_YEAR", label: "1 Year" },
  { value: "NO_EXPIRATION", label: "No Expiration" },
];

interface TestResult {
  webhookUrl: string;
  testResult: any;
  payload: Record<string, unknown>;
}

interface MappingRule {
  source: string;
  target: string;
}

interface FirsDictionaryField {
  field_id: string;
  field_path: string;
  data_type: string;
  description: string;
  is_required: boolean;
}

interface WebhookEvent {
  id: string;
  eventId: string;
  eventType: string;
  status: string;
  irn?: string;
  erpInvoiceId?: string;
  jobErrorCount?: number;
  createdAt: string;
  // populated on row click from detail endpoint
  payload?: any;
  metadata?: any;
  jobErrors?: { step: number; action: string; error: string; failedAt: string }[];
  failureReason?: string;
  webhookUrl?: string;
}

// ===== Utilities =====

function flattenObject(obj: any, prefix = ""): { key: string; type: string }[] {
  const result: { key: string; type: string }[] = [];
  if (!obj || typeof obj !== "object") return result;

  if (Array.isArray(obj)) {
    if (obj.length > 0 && typeof obj[0] === "object") {
      result.push(...flattenObject(obj[0], `${prefix}[*]`));
    } else {
      result.push({ key: prefix || "root", type: "array" });
    }
    return result;
  }

  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      result.push(...flattenObject(v, fullKey));
    } else if (Array.isArray(v)) {
      if (v.length > 0 && typeof v[0] === "object") {
        result.push(...flattenObject(v[0], `${fullKey}[*]`));
      } else {
        result.push({ key: fullKey, type: "array" });
      }
    } else {
      result.push({ key: fullKey, type: typeof v });
    }
  }
  return result;
}

// ===== Event Card (expandable) =====

function EventCard({
  evt,
  eventJson,
  isLong,
  onMap,
}: {
  evt: any;
  eventJson: string;
  isLong: boolean;
  onMap: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {evt.eventType || evt.event || "event"}
          </Badge>
          {evt.eventId && (
            <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
              {evt.eventId}
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {evt._receivedAt ? format(new Date(evt._receivedAt), "HH:mm:ss") : ""}
        </span>
      </div>
      <pre
        className={cn(
          "text-xs font-mono bg-muted p-2 rounded overflow-x-auto transition-all",
          !expanded && isLong ? "max-h-[160px] overflow-y-hidden" : "",
        )}
      >
        {eventJson}
      </pre>
      <div className="flex items-center gap-2 mt-2">
        <Button size="sm" variant="outline" onClick={onMap}>
          <Link2 className="w-3 h-3 mr-2" />
          Map this Event
        </Button>
        {isLong && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-muted-foreground"
            onClick={() => setExpanded((v) => !v)}
          >
            <ChevronDown
              className={cn(
                "w-3 h-3 mr-1 transition-transform",
                expanded && "rotate-180",
              )}
            />
            {expanded ? "Collapse" : "Expand"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ===== Main Component =====

export default function WebhookSettingsPage() {
  const { tenantId, tenantData, refetch } = useTenant();
  const { hasPermission } = usePermissions();
  const tenantAPI = getTenantApiClient();
  const canUpdate = hasPermission("settings:update");
  const [activeTab, setActiveTab] = usePersistedTab("configuration");

  // Config state
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig | null>(
    null,
  );
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [secretVisible, setSecretVisible] = useState(false);
  const [rawSecret, setRawSecret] = useState<string | null>(null);
  const [keyConfig, setKeyConfig] = useState({
    invoiceIdKey: "",
    creditNoteIdKey: "",
    creditNoteReferenceIdKey: "",
  });
  const [keyConfigLoading, setKeyConfigLoading] = useState(true);

  // Webhook expiration/lifespan status
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [webhookStatusLoading, setWebhookStatusLoading] = useState(true);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedLifespan, setSelectedLifespan] = useState("NO_EXPIRATION");

  // Test state
  const [testMode, setTestMode] = useState<"manual" | "listen">("manual");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testPassed, setTestPassed] = useState(false);
  const [customPayload, setCustomPayload] = useState("");

  // Event mapping state
  const [eventMappings, setEventMappings] = useState<EventMapping[]>([]);
  const [savedMappings, setSavedMappings] = useState<EventMapping[]>([]);
  const [savingMappings, setSavingMappings] = useState(false);

  // Data mapping state
  const [firsFields, setFirsFields] = useState<FirsDictionaryField[]>([]);
  const [firsLoading, setFirsLoading] = useState(false);
  const [receivedPayload, setReceivedPayload] = useState<any>(null);
  const [mappingData, setMappingData] = useState<MappingRule[]>([]);
  const [showMapper, setShowMapper] = useState(false);
  const [savingFieldMappings, setSavingFieldMappings] = useState(false);

  // History state
  const [webhookHistory, setWebhookHistory] = useState<WebhookEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historySearch, setHistorySearch] = useState("");
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);
  const historyLoadedRef = useRef(false);
  const historySearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);
  const [viewingJson, setViewingJson] = useState<{
    title: string;
    data: any;
  } | null>(null);

  // Listener state
  const [isListening, setIsListening] = useState(false);
  const [listenerConnected, setListenerConnected] = useState(false);
  const [listenedEvents, setListenedEvents] = useState<any[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load event routing from the new API
  const fetchEventRouting = useCallback(async () => {
    if (!tenantId) return;
    try {
      const adminApi = getAdminApiClient();
      const response = await (adminApi as any).v1.admin.tenants[tenantId][
        "event-routing"
      ].get();
      if (!response.error && response.data?.data?.routes) {
        const routes: EventMapping[] = (response.data.data.routes as any[]).map(
          (r: any) => ({
            routeId: r.routeId,
            event:
              typeof r.event === "object" ? r.event?.id || "" : r.event || "",
            actions: Array.isArray(r.actions)
              ? r.actions.map((a: any) =>
                  typeof a === "object" ? a?.id || "" : a,
                )
              : [],
            enabled: r.enabled !== false,
            description: r.description || "",
          }),
        );
        setEventMappings(routes);
        setSavedMappings(routes);
      } else {
        toast.error(
          (response.error as any)?.value?.error || "Failed to load event routing",
        );
        setEventMappings([]);
        setSavedMappings([]);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to load event routing");
      setEventMappings([]);
      setSavedMappings([]);
    }
  }, [tenantId]);

  // Load credit/debit note key config from the new bearer-token-authed endpoint
  const fetchKeyConfig = useCallback(async () => {
    if (!tenantId) return;
    setKeyConfigLoading(true);
    try {
      const api = createTenantApi();
      const response = await api.getKeyConfig(tenantId);
      if (response.error) {
        const errorMessage =
          (response.error as any)?.value?.error ||
          (response.error as any)?.status ||
          "Failed to load invoice ID key configuration";
        console.error("getKeyConfig failed:", response.error);
        toast.error(
          typeof errorMessage === "string"
            ? errorMessage
            : "Failed to load invoice ID key configuration",
        );
      } else if (response.data?.data) {
        const data = response.data.data as any;
        setKeyConfig({
          invoiceIdKey: data.invoiceIdKey || "",
          creditNoteIdKey: data.idKeyMap?.[CREDIT_NOTE_EVENT_TYPE] || "",
          creditNoteReferenceIdKey:
            data.referenceIdKeyMap?.[CREDIT_NOTE_EVENT_TYPE] || "",
        });
      }
    } catch (error: any) {
      console.error("getKeyConfig threw:", error);
      toast.error(error?.message || "Failed to load invoice ID key configuration");
    } finally {
      setKeyConfigLoading(false);
    }
  }, [tenantId]);

  // Load config from tenant data
  useEffect(() => {
    if (tenantData) {
      const td = tenantData as any;
      const config = td?.data?.config || td?.data || td?.config || td;
      const metadata = td?.data?.metadata || td?.metadata || {};

      setWebhookEnabled(!!config?.webhookEnabled);

      if (config?.webhookUrl) {
        console.log({ config, metadata });
        setWebhookConfig({
          webhookUrl: config.webhookUrl,
          webhookSecret: config.webhookAuth || "••••••••",
          webhookPath: metadata.webhookPath || config.webhookPath || "",
          webhookEnabled: !!config.webhookEnabled,
        });
      }

      // Fetch event routing from new API
      fetchEventRouting();
      fetchKeyConfig();

      if (metadata?.webhookFieldMappings) {
        setMappingData(metadata.webhookFieldMappings);
      }

      setLoadingConfig(false);
    }
  }, [tenantData, fetchEventRouting, fetchKeyConfig]);

  // Live webhook status (lifespan/expiry) — tenantData above only has the URL
  // fields already baked into the tenant record, not expiry info, so this is
  // a dedicated fetch rather than something derivable from useTenant().
  const fetchWebhookStatus = useCallback(async () => {
    if (!tenantId) return;
    setWebhookStatusLoading(true);
    try {
      const api = createTenantApi();
      const response = await api.getWebhookConfig(tenantId);
      if (!response.error && response.data?.data) {
        setWebhookStatus(response.data.data as WebhookStatus);
      }
    } catch {
      // Status is supplementary — the URL/enabled fields still render from
      // tenantData above even if this fetch fails.
    } finally {
      setWebhookStatusLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchWebhookStatus();
  }, [fetchWebhookStatus]);

  // Fetch NRS dictionary for mapping target fields
  const fetchFirsDictionary = useCallback(async () => {
    setFirsLoading(true);
    try {
      const adminApi = getAdminApiClient();
      const response = await adminApi.v1.admin.config["firs-dictionary"].get();
      if (
        response.data &&
        "data" in response.data &&
        (response.data as any).data
      ) {
        const data = (response.data as any).data;
        if (data.fields && Array.isArray(data.fields)) {
          setFirsFields(data.fields);
        }
      }
    } catch {
      // NRS dictionary may not exist yet
    } finally {
      setFirsLoading(false);
    }
  }, []);

  const fetchWebhookEvents = useCallback(async (page: number, limit: number, search?: string) => {
    if (!tenantId) return;
    setHistoryLoading(true);
    try {
      const api = createTenantApi();
      const response = await api.getWebhookEvents({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
      });
      if (response.error) {
        toast.error(
          (response.error as any)?.value?.error || "Failed to load webhook history",
        );
        return;
      }
      const data = ((response.data as any)?.data as any[]) ?? [];
      const meta = (response.data as any)?.meta;
      const events: WebhookEvent[] = data.map((evt: any) => ({
        id: evt.eventId,
        eventId: evt.eventId,
        eventType: evt.eventType || "unknown",
        status: evt.status || "unknown",
        irn: evt.irn,
        erpInvoiceId: evt.erpInvoiceId,
        jobErrorCount: evt.jobErrorCount ?? 0,
        createdAt: evt.createdAt,
      }));
      setWebhookHistory(events);
      setHistoryTotal(meta?.total ?? events.length);
      historyLoadedRef.current = true;
    } catch (error: any) {
      toast.error(error?.message || "Failed to load webhook history");
    } finally {
      setHistoryLoading(false);
    }
  }, [tenantId]);

  const fetchWebhookEventDetail = useCallback(async (evt: WebhookEvent) => {
    setSelectedEvent(evt);
    setHistoryDetailLoading(true);
    try {
      const api = createTenantApi();
      const response = await api.getWebhookEvent(evt.eventId);
      if (!response.error) {
        const detail = (response.data as any)?.data;
        setSelectedEvent((prev) =>
          prev
            ? {
                ...prev,
                payload: detail?.payload,
                metadata: detail?.metadata,
                jobErrors: detail?.jobErrors,
                failureReason: detail?.failureReason,
                webhookUrl: detail?.webhookUrl,
              }
            : prev,
        );
      }
    } catch {
      // basic info still shows in dialog
    } finally {
      setHistoryDetailLoading(false);
    }
  }, []);

  // Re-fetch when page, page size, or search changes (only after first load)
  useEffect(() => {
    if (!historyLoadedRef.current) return;
    fetchWebhookEvents(historyPage, historyPageSize, historySearch);
  }, [historyPage, historyPageSize, historySearch, fetchWebhookEvents]);

  // ===== Handlers =====

  const handleGenerate = async () => {
    if (!tenantId) return;
    setIsGenerating(true);
    try {
      const api = createTenantApi();
      const response = await api.generateWebhook(tenantId, { lifespan: selectedLifespan });
      if (response.error) {
        toast.error(
          (response.error as any)?.value?.error ||
            "Failed to generate webhook URL",
        );
      } else {
        const data = (response.data as any)?.data;
        if (data?.webhookUrl) {
          setRawSecret(data.webhookSecret);
          setSecretVisible(true);
          setWebhookConfig({
            webhookUrl: data.webhookUrl,
            webhookSecret: data.webhookSecret,
            webhookPath: data.webhookPath,
            webhookEnabled: true,
          });
          setWebhookEnabled(true);
          setShowGenerateDialog(false);
          toast.success(
            "Webhook generated successfully. Copy your secret now — it won't be shown again.",
          );
          refetch();
          fetchWebhookStatus();
        }
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate webhook URL");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleWebhook = async (enabled: boolean) => {
    if (!tenantId) return;
    try {
      const api = createTenantApi();
      const response = await api.updateTenant(tenantId, {
        webhookEnabled: enabled,
      });
      if (response.error) {
        toast.error(
          (response.error as any)?.value?.error || "Failed to update webhook",
        );
      } else {
        setWebhookEnabled(enabled);
        toast.success(`Webhook ${enabled ? "enabled" : "disabled"}`);
        refetch();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to update webhook");
    }
  };

  const handleTest = async () => {
    if (!tenantId) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const api = createTenantApi();
      let payload: Record<string, unknown> | undefined;
      if (customPayload.trim()) {
        try {
          payload = JSON.parse(customPayload);
        } catch {
          toast.error("Invalid JSON payload");
          setIsTesting(false);
          return;
        }
      }

      const response = await api.testWebhook(tenantId, payload);
      if (response.error) {
        const errMessage = (response.error as any)?.value?.error || "Webhook test failed";
        const isExpiredError =
          (response.error as any)?.status === 400 && /expired/i.test(errMessage);
        toast.error(
          isExpiredError
            ? "Your webhook credentials have expired. Regenerate them to continue testing."
            : errMessage,
        );
        setIsTesting(false);
        return;
      }

      const data = (response.data as any)?.data;
      if (data) {
        setTestResult(data);
        const passed = data.testResult?.success !== false;
        setTestPassed(passed);

        // Set received payload for mapping
        const receivedData =
          data.payload || data.testResult?.data || (payload ? payload : null);
        if (receivedData) {
          setReceivedPayload(receivedData);
        }

        toast[passed ? "success" : "error"](
          passed ? "Webhook test passed!" : "Webhook test failed",
        );
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to test webhook");
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleSaveMappings = async () => {
    if (!tenantId) return;
    const validMappings = eventMappings.filter(
      (m) => m.event && m.actions.length > 0,
    );
    if (validMappings.length === 0) {
      toast.error("Please add at least one valid event mapping with actions");
      return;
    }
    setSavingMappings(true);
    try {
      const adminApi = getAdminApiClient();
      const routeBase = (adminApi as any).v1.admin.tenants[tenantId][
        "event-routing"
      ].routes;

      // Separate new routes (no routeId) from existing routes (have routeId)
      const newRoutes = validMappings.filter((m) => !m.routeId);
      const existingRoutes = validMappings.filter((m) => m.routeId);

      const results = await Promise.all([
        // POST new routes
        ...newRoutes.map((m) =>
          routeBase.post({
            event: m.event,
            actions: m.actions,
            enabled: m.enabled,
            ...(m.description && { description: m.description }),
          }),
        ),
        // PATCH existing routes
        ...existingRoutes.map((m) =>
          routeBase[m.routeId!].patch({
            event: m.event,
            actions: m.actions,
            enabled: m.enabled,
            ...(m.description && { description: m.description }),
          }),
        ),
      ]);

      const hasError = results.some((r: any) => r.error);
      if (hasError) {
        const firstError = results.find((r: any) => r.error);
        toast.error(
          (firstError as any)?.error?.value?.error ||
            "Failed to save some event routes",
        );
      } else {
        // Re-fetch to get routeIds assigned to new routes
        await fetchEventRouting();
        toast.success("Event routes saved successfully");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to save event routes");
    } finally {
      setSavingMappings(false);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!tenantId) return;
    const adminApi = getAdminApiClient();
    const response = await (adminApi as any).v1.admin.tenants[tenantId][
      "event-routing"
    ].routes[routeId].delete();
    if (response.error) {
      const errorMessage =
        (response.error as any)?.value?.error || "Failed to delete route";
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    toast.success("Route removed");
  };

  // Field mapping handlers
  const addFieldMapping = (source: string, target: string) => {
    if (mappingData.some((m) => m.source === source && m.target === target))
      return;
    setMappingData([...mappingData, { source, target }]);
  };

  const removeFieldMappingBySource = (source: string) => {
    setMappingData(mappingData.filter((m) => m.source !== source));
  };

  const removeFieldMappingByTarget = (target: string) => {
    setMappingData(mappingData.filter((m) => m.target !== target));
  };

  const handleSaveFieldMappings = async () => {
    if (!tenantId) return;
    setSavingFieldMappings(true);
    try {
      const api = createTenantApi();
      const response = await api.updateTenant(tenantId, {
        metadata: { webhookFieldMappings: mappingData },
      });
      if (response.error) {
        toast.error(
          (response.error as any)?.value?.error ||
            "Failed to save field mappings",
        );
      } else {
        toast.success("Field mappings saved successfully");
        refetch();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to save field mappings");
    } finally {
      setSavingFieldMappings(false);
    }
  };

  const handleOpenMapper = () => {
    if (firsFields.length === 0) {
      fetchFirsDictionary();
    }
    setShowMapper(true);
  };

  const handlePastePayload = () => {
    if (!customPayload.trim()) {
      toast.error("Enter a JSON payload first");
      return;
    }
    try {
      const parsed = JSON.parse(customPayload);
      setReceivedPayload(parsed);
      handleOpenMapper();
    } catch {
      toast.error("Invalid JSON");
    }
  };

  const connectedHandler = (data) => {
    try {
      setListenerConnected(true);
      toast.success(data.message || "Connected : listening for events");
    } catch {
      setListenerConnected(true);
      toast.success("Connected : listening for events");
    }
  };

  const listenerEventHandler = (data) => {
    try {
      console.log(data);
      setListenedEvents((prev) => [
        { ...data, _receivedAt: new Date().toISOString() },
        ...prev,
      ]);
      toast.info(`Event received: ${data.eventType || "webhook_event"}`);

      // Auto-set as received payload for mapping
      setReceivedPayload(data.payload || data.data || data);
    } catch {
      // raw text event
      setListenedEvents((prev) => [
        { raw: data, _receivedAt: new Date().toISOString() },
        ...prev,
      ]);
    }
  };
  // SSE Listener handlers
  const handleStartListening = async () => {
    try {
      console.log({ webhookConfig });
      if (!webhookConfig?.webhookPath) {
        toast.error(
          "No webhook path configured. Generate a webhook URL first.",
        );
        return;
      }
      const listenerURL = stripTrailingSlash(
        webhookConfig?.webhookUrl.replace("inbound", "listen"),
      );
      console.log("listener: ", listenerURL);

      setIsListening(true);
      setListenerConnected(false);
      setListenedEvents([]);

      const { data, error }: any =
        await createTenantWebhookListener(listenerURL).get();
      if (error) {
        setIsListening(false);
        setListenerConnected(false);
        toast.error("Listener connection closed");
      }

      for await (const chunk of data) {
        console.log({ chunk });
        const eventType = (chunk as any)?.event || (chunk as any)?.eventType;

        switch (eventType) {
          case "connected":
            connectedHandler(chunk);
            break;
          default:
            listenerEventHandler(chunk);
            break;
        }
      }
    } catch (error) {
      setIsListening(false);
      setListenerConnected(false);
      toast.error("Listener connection closed");
    }
  };
  const _handleStartListening = () => {
    console.log({ webhookConfig });
    if (!webhookConfig?.webhookPath) {
      toast.error("No webhook path configured. Generate a webhook URL first.");
      return;
    }

    const apiUrl = `${window.location.origin}/api/v1`;
    const sseUrl = webhookConfig?.webhookUrl.replace("inbound", "listen");
    //`${apiUrl}/webhook/listen/${webhookConfig.webhookPath}`

    setIsListening(true);
    setListenerConnected(false);
    setListenedEvents([]);

    const es = new EventSource(sseUrl, { withCredentials: true });
    eventSourceRef.current = es;

    es.addEventListener("connected", (e) => {
      try {
        const data = JSON.parse(e.data);
        setListenerConnected(true);
        toast.success(data.message || "Connected : listening for events");
      } catch {
        setListenerConnected(true);
        toast.success("Connected : listening for events");
      }
    });

    es.addEventListener("webhook_event", (e) => {
      try {
        console.log(e.data);
        const data = JSON.parse(e.data);
        setListenedEvents((prev) => [
          { ...data, _receivedAt: new Date().toISOString() },
          ...prev,
        ]);
        toast.info(`Event received: ${data.eventType || "webhook_event"}`);

        // Auto-set as received payload for mapping
        setReceivedPayload(data.payload || data.data || data);
      } catch {
        // raw text event
        setListenedEvents((prev) => [
          { raw: e.data, _receivedAt: new Date().toISOString() },
          ...prev,
        ]);
      }
    });

    // Generic message handler for unnamed events
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === "connected") {
          setListenerConnected(true);
          toast.success(
            data.data?.message || "Connected : listening for events",
          );
          return;
        }
        setListenedEvents((prev) => [
          { ...data, _receivedAt: new Date().toISOString() },
          ...prev,
        ]);
        toast.info(
          `Event received: ${data.event || data.eventType || "event"}`,
        );
        setReceivedPayload(data.data || data.payload || data);
      } catch {
        // non-JSON message
      }
    };

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        setIsListening(false);
        setListenerConnected(false);
        toast.error("Listener connection closed");
      }
    };
  };

  const handleStopListening = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsListening(false);
    setListenerConnected(false);
    toast.warning("Stopped listening");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Derived fields for mapping
  const sourceFields = useMemo(() => {
    if (!receivedPayload) return [];
    return flattenObject(receivedPayload);
  }, [receivedPayload]);

  const targetFields = useMemo(() => {
    return firsFields.map((f) => ({
      key: f.field_path || f.field_id,
      type: f.data_type,
      required: f.is_required,
      description: f.description,
    }));
  }, [firsFields]);

  // History columns
  const historyColumns: Column<WebhookEvent>[] = [
    {
      key: "eventType",
      header: "Event Type",
      sortable: true,
      accessor: (evt) => (
        <span className="font-mono text-xs">{evt.eventType}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (evt) => <StatusBadge status={evt.status} />,
    },
    {
      key: "irn",
      header: "Invoice IRN",
      accessor: (evt) => (
        <span className="text-xs text-muted-foreground font-mono">
          {evt.irn || "N/A"}
        </span>
      ),
    },
    {
      key: "jobErrors",
      header: "Errors",
      accessor: (evt) =>
        evt.jobErrorCount ? (
          <Badge variant="destructive" className="text-xs">
            {evt.jobErrorCount} error{evt.jobErrorCount !== 1 ? "s" : ""}
          </Badge>
        ) : null,
    },
    {
      key: "createdAt",
      header: "Time",
      sortable: true,
      accessor: (evt) => (
        <div className="text-xs">
          <p className="text-muted-foreground">
            {evt.createdAt
              ? formatDistanceToNow(new Date(evt.createdAt), {
                  addSuffix: true,
                })
              : "N/A"}
          </p>
          {evt.createdAt && (
            <p className="text-muted-foreground/70">
              {format(new Date(evt.createdAt), "MMM dd, HH:mm")}
            </p>
          )}
        </div>
      ),
    },
  ];

  if (loadingConfig) {
    return <SectionLoader message="Loading webhook" />;
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Webhook Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure webhooks to receive events from external systems and
              route them to workflows
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="contents">
                <TabsTrigger
                  value="configuration"
                  className="text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Webhook className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Configuration</span>
                </TabsTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent className="sm:hidden">Configuration</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="contents">
                <TabsTrigger
                  value="invoice-id-keys"
                  className="text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Key className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Invoice Keys</span>
                </TabsTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent className="sm:hidden">Invoice Keys</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="contents">
                <TabsTrigger
                  value="test"
                  className="text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Zap className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Test & Map</span>
                </TabsTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent className="sm:hidden">Test & Map</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="contents">
                <TabsTrigger
                  value="routing"
                  className="text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Settings2 className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Event Routing</span>
                </TabsTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent className="sm:hidden">Event Routing</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="contents">
                <TabsTrigger
                  value="history"
                  className="text-xs sm:text-sm px-2 sm:px-3"
                  onClick={() => {
                    if (!historyLoadedRef.current && !historyLoading)
                      fetchWebhookEvents(historyPage, historyPageSize, historySearch);
                  }}
                >
                  <Activity className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">History</span>
                </TabsTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent className="sm:hidden">History</TooltipContent>
            </Tooltip>
          </TabsList>

          {/* ===== TAB 1: Configuration ===== */}
          <TabsContent value="configuration" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Webhook className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Webhook Endpoint</CardTitle>
                      <CardDescription>
                        Your webhook URL receives events from external systems
                        like ERPs and NRS
                      </CardDescription>
                    </div>
                  </div>
                  {webhookConfig && canUpdate && (
                    <div className="flex items-center gap-3">
                      <Label
                        htmlFor="webhook-toggle"
                        className="text-sm text-muted-foreground"
                      >
                        {webhookEnabled ? "Enabled" : "Disabled"}
                      </Label>
                      <Switch
                        id="webhook-toggle"
                        checked={webhookEnabled}
                        onCheckedChange={handleToggleWebhook}
                      />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {webhookConfig ? (
                  <div className="space-y-4">
                    {webhookStatus?.isExpired && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Webhook URL and secret expired. Inbound webhooks are rejected. Please regenerate.
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">
                          Webhook URL
                        </Label>
                        {!webhookStatusLoading && webhookStatus && (
                          <WebhookExpiryBadge
                            isExpired={webhookStatus.isExpired}
                            expiresAt={webhookStatus.expiresAt}
                            remainingDays={webhookStatus.remainingDays}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={webhookConfig.webhookUrl}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            copyToClipboard(
                              webhookConfig.webhookUrl,
                              "Webhook URL",
                            )
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Webhook Secret
                      </Label>
                      {secretVisible && rawSecret ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              value={rawSecret}
                              readOnly
                              className="font-mono text-xs"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                copyToClipboard(rawSecret, "Webhook Secret");
                                setSecretVisible(false);
                                setRawSecret(null);
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <Alert variant="destructive" className="py-2">
                            <AlertDescription className="text-xs">
                              Copy this secret now. Once you navigate away or
                              copy it, it will be hidden and cannot be retrieved
                              again.
                            </AlertDescription>
                          </Alert>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            value="••••••••••••••••••••••••"
                            readOnly
                            className="font-mono text-xs"
                            type="password"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            disabled
                            title="Secret is hidden. Regenerate to get a new one."
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <Alert className="border-info/30 bg-info/5 text-info">
                      <AlertCircle className="h-4 w-4 text-info" />
                      <AlertDescription className="text-xs space-y-1 text-info">
                        <p>
                          <strong>
                            How to authenticate incoming webhooks:
                          </strong>
                        </p>
                        <p>
                          Send your webhook secret in the request headers as{" "}
                          <code className="font-mono bg-info/10 px-1 py-0.5 rounded">
                            X-Webhook-Key
                          </code>
                          . Requests without this header or with an incorrect
                          value will be rejected.
                        </p>
                      </AlertDescription>
                    </Alert>
                    <Alert className="border-warning/30 bg-warning/5">
                      <AlertCircle className="h-4 w-4 text-warning" />
                      <AlertDescription className="text-xs space-y-1 text-warning">
                        <p>
                          <strong>Also required — X-Event-Type header:</strong>
                        </p>
                        <p>
                          Each request must also include an{" "}
                          <code className="font-mono bg-warning/10 px-1 py-0.5 rounded">
                            X-Event-Type
                          </code>{" "}
                          header. The value should match the event type for the
                          action being triggered — copy it from the{" "}
                          <strong>Event Routing</strong> tab and use it as this
                          header&apos;s value.
                        </p>
                      </AlertDescription>
                    </Alert>
                    {canUpdate && (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isGenerating}
                        onClick={() => {
                          setSelectedLifespan(webhookStatus?.lifespan || "NO_EXPIRATION");
                          setShowGenerateDialog(true);
                        }}
                      >
                        <RefreshCw
                          className={`w-4 h-4 mr-2 ${isGenerating ? "animate-spin" : ""}`}
                        />
                        Regenerate URL & Secret
                      </Button>
                    )}
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs space-y-1">
                        <p>
                          <strong>Warning:</strong> Regenerating will create a
                          new URL and secret, invalidating the previous ones and
                          revoking all configurations tied to them.
                        </p>
                        <p>
                          Ensure you update any external systems using the old
                          credentials before regenerating.
                        </p>
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Webhook className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      No Webhook Configured
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Generate a webhook URL to start receiving events from
                      external systems.
                    </p>
                    {canUpdate && (
                      <Button
                        onClick={() => {
                          setSelectedLifespan("NO_EXPIRATION");
                          setShowGenerateDialog(true);
                        }}
                        disabled={isGenerating}
                      >
                        <Webhook className="mr-2 h-4 w-4" />
                        Generate Webhook URL
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* How it works info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">How Webhooks Work</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      step: "1",
                      title: "Receive",
                      desc: "External systems (ERP, NRS) send events to your webhook URL via HTTP POST",
                    },
                    {
                      step: "2",
                      title: "Route",
                      desc: "Events are matched against your configured event mappings and routed to the appropriate workflow",
                    },
                    {
                      step: "3",
                      title: "Process",
                      desc: "The workflow processes the event: transforms, validates, signs, and transmits the invoice data",
                    },
                  ].map((s) => (
                    <div
                      key={s.step}
                      className="p-4 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {s.step}
                        </div>
                        <span className="font-medium">{s.title}</span>
                      </div>
                      <p className="text-muted-foreground text-xs">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== TAB 2: Invoice Keys ===== */}
          <TabsContent value="invoice-id-keys" className="space-y-6 mt-6">
            {/* Invoice ID Keys */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Invoice ID Keys
                </CardTitle>
                <CardDescription>
                  Configure where to find each invoice type&apos;s ID in
                  incoming webhook payloads
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {keyConfigLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Standard Invoice</p>
                      <InvoiceIdKeyEditor
                        initialValue={keyConfig.invoiceIdKey}
                        disabled={!canUpdate}
                        onSave={async (key) => {
                          if (!tenantId) return;
                          const api = createTenantApi();
                          const res = await api.updateInvoiceIdKey(
                            tenantId,
                            key,
                          );
                          if (res.error)
                            throw new Error(
                              (res.error as any)?.value?.error ||
                                "Failed to update invoice ID key",
                            );
                        }}
                        onSaved={() => fetchKeyConfig()}
                      />
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                      <p className="text-sm font-medium">Credit Note</p>
                      <InvoiceIdKeyEditor
                        initialValue={keyConfig.creditNoteIdKey}
                        placeholder="e.g. creditNote.documentId"
                        successMessage="Credit note ID key updated"
                        disabled={!canUpdate}
                        onSave={async (key) => {
                          if (!tenantId) return;
                          const api = createTenantApi();
                          const res = await api.updateIdKeyMap(
                            tenantId,
                            CREDIT_NOTE_EVENT_TYPE,
                            key,
                          );
                          if (res.error)
                            throw new Error(
                              (res.error as any)?.value?.error ||
                                "Failed to update credit note ID key",
                            );
                        }}
                        onSaved={() => fetchKeyConfig()}
                      />
                      <InvoiceIdKeyEditor
                        initialValue={keyConfig.creditNoteReferenceIdKey}
                        label="Reference ID Key"
                        placeholder="e.g. creditNote.originalInvoiceId"
                        helpText="Dot-notation path to the original invoice's ID, used to validate this credit note against it"
                        successMessage="Credit note reference ID key updated"
                        disabled={!canUpdate}
                        onSave={async (key) => {
                          if (!tenantId) return;
                          const api = createTenantApi();
                          const res = await api.updateReferenceIdKeyMap(
                            tenantId,
                            CREDIT_NOTE_EVENT_TYPE,
                            key,
                          );
                          if (res.error)
                            throw new Error(
                              (res.error as any)?.value?.error ||
                                "Failed to update credit note reference ID key",
                            );
                        }}
                        onSaved={() => fetchKeyConfig()}
                      />
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Debit Note
                        </p>
                        <Badge variant="outline" className="text-xs gap-1">
                          <Lock className="w-3 h-3" />
                          Coming soon
                        </Badge>
                      </div>
                      <div className="space-y-2 opacity-60">
                        <Label className="text-xs text-muted-foreground">
                          Invoice ID Key
                        </Label>
                        <Input
                          disabled
                          placeholder="e.g. debitNote.documentId"
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-2 opacity-60">
                        <Label className="text-xs text-muted-foreground">
                          Reference ID Key
                        </Label>
                        <Input
                          disabled
                          placeholder="e.g. debitNote.originalInvoiceId"
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== TAB 2: Event Routing ===== */}
          <TabsContent value="routing" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-info flex items-center justify-center">
                      <Settings2 className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <CardTitle>Invoice Event Routing</CardTitle>
                      <CardDescription>
                        Map incoming webhook events to the appropriate
                        processing workflow
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <EventMappingEditor
                  mappings={eventMappings}
                  onChange={setEventMappings}
                  savedMappings={savedMappings}
                  readOnly={!canUpdate}
                  onDeleteRoute={handleDeleteRoute}
                />
                {canUpdate && eventMappings.length > 0 && (
                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handleSaveMappings}
                      disabled={
                        savingMappings ||
                        JSON.stringify(eventMappings) ===
                          JSON.stringify(savedMappings)
                      }
                    >
                      {savingMappings ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Mappings"
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== TAB 3: Test & Map ===== */}
          <TabsContent value="test" className="space-y-6 mt-6">
            {/* Mode selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setTestMode("manual");
                  if (isListening) handleStopListening();
                }}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors",
                  testMode === "manual"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/40 bg-card",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                    testMode === "manual" ? "bg-primary/10" : "bg-muted",
                  )}
                >
                  <Zap
                    className={cn(
                      "w-4 h-4",
                      testMode === "manual"
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                  />
                </div>
                <div>
                  <p className="font-medium text-sm">Manual Input</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Paste a JSON payload and send it as a test event to your
                    webhook
                  </p>
                </div>
              </button>

              <button
                onClick={() => setTestMode("listen")}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors",
                  testMode === "listen"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/40 bg-card",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                    testMode === "listen" ? "bg-primary/10" : "bg-muted",
                  )}
                >
                  <Radio
                    className={cn(
                      "w-4 h-4",
                      testMode === "listen"
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                  />
                </div>
                <div>
                  <p className="font-medium text-sm">Listen to Events</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Open a live stream and capture real events as they arrive at
                    your webhook
                  </p>
                </div>
              </button>
            </div>

            {/* Mode: Manual Input */}
            {testMode === "manual" && (
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Manual Test</CardTitle>
                      <CardDescription>
                        Send a custom JSON payload to your webhook endpoint
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Test Payload (JSON)
                    </Label>
                    <textarea
                      value={customPayload}
                      onChange={(e) => setCustomPayload(e.target.value)}
                      placeholder='{"event": "erp.invoice.created", "data": {"invoiceNumber": "INV-001", "amount": 50000, "currency": "NGN", "customer": {"name": "Acme Ltd", "tin": "12345678"}}}'
                      className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use a default test payload. Paste an
                      invoice JSON to test field mapping.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {/*      <Button onClick={handleTest} disabled={isTesting || !webhookConfig}>
                      {isTesting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                      ) : (
                        <><Zap className="mr-2 h-4 w-4" />{testResult ? 'Retry Test' : 'Send Test Payload'}</>
                      )}
                    </Button> */}
                    <Button
                      onClick={handlePastePayload}
                      variant="outline"
                      disabled={!customPayload.trim()}
                    >
                      <Link2 className="mr-2 h-4 w-4" />
                      Map Payload Fields
                    </Button>
                  </div>

                  {!webhookConfig && (
                    <p className="text-xs text-muted-foreground">
                      Generate a webhook URL in the Configuration tab first.
                    </p>
                  )}

                  {testResult && (
                    <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-2">
                        {testPassed ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                        <span
                          className={`font-medium ${testPassed ? "text-success" : "text-destructive"}`}
                        >
                          {testPassed ? "Test Passed" : "Test Failed"}
                        </span>
                      </div>
                      {testResult.webhookUrl && (
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">
                            Webhook URL:
                          </span>
                          <p className="text-xs font-mono bg-muted p-2 rounded">
                            {testResult.webhookUrl}
                          </p>
                        </div>
                      )}
                      {testResult.testResult && (
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">
                            Response:
                          </span>
                          <pre className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto max-h-[200px]">
                            {JSON.stringify(testResult.testResult, null, 2)}
                          </pre>
                        </div>
                      )}
                      {testPassed && receivedPayload && (
                        <Button size="sm" onClick={handleOpenMapper}>
                          <Link2 className="w-4 h-4 mr-2" />
                          Map Fields to NRS Schema
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Mode: Listen to Events */}
            {testMode === "listen" && (
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center",
                          isListening ? "bg-success/10" : "bg-primary/10",
                        )}
                      >
                        <Radio
                          className={cn(
                            "w-4 h-4",
                            isListening ? "text-success" : "text-primary",
                          )}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          Live Event Listener
                        </CardTitle>
                        <CardDescription>
                          Connect to your webhook stream and capture incoming
                          events in real time
                        </CardDescription>
                      </div>
                    </div>
                    {isListening ? (
                      <Button
                        onClick={handleStopListening}
                        variant="destructive"
                        size="sm"
                      >
                        <StopCircle className="mr-2 h-4 w-4" />
                        Stop Listening
                      </Button>
                    ) : (
                      <Button
                        onClick={handleStartListening}
                        disabled={!webhookConfig}
                        size="sm"
                      >
                        <Radio className="mr-2 h-4 w-4" />
                        Start Listening
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!webhookConfig && (
                    <Alert>
                      <Webhook className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Generate a webhook URL in the Configuration tab before
                        listening for events.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Connection status bar */}
                  <div
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg border",
                      isListening
                        ? listenerConnected
                          ? "border-success/30 bg-success/5"
                          : "border-warning/30 bg-warning/5"
                        : "border-border bg-muted/30",
                    )}
                  >
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      {isListening && (
                        <span
                          className={cn(
                            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                            listenerConnected ? "bg-success" : "bg-warning",
                          )}
                        />
                      )}
                      <span
                        className={cn(
                          "relative inline-flex rounded-full h-2.5 w-2.5",
                          isListening
                            ? listenerConnected
                              ? "bg-success"
                              : "bg-warning"
                            : "bg-muted-foreground/30",
                        )}
                      />
                    </span>
                    <span className="text-sm">
                      {!isListening && "Not connected"}
                      {isListening &&
                        !listenerConnected &&
                        "Connecting to event stream..."}
                      {isListening &&
                        listenerConnected &&
                        "Connected : listening for events"}
                    </span>
                    {isListening && (
                      <Badge variant="outline" className="text-[10px] ml-auto">
                        {listenedEvents.length} event
                        {listenedEvents.length !== 1 ? "s" : ""} received
                      </Badge>
                    )}
                  </div>

                  {/* Received events feed */}
                  {listenedEvents.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">
                          Received Events
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 text-muted-foreground"
                          onClick={() => setListenedEvents([])}
                        >
                          Clear
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {listenedEvents.map((evt, idx) => {
                          const eventJson = JSON.stringify(
                            evt.data || evt.payload || evt,
                            null,
                            2,
                          );
                          const isLong = eventJson.split("\n").length > 8;
                          return (
                            <EventCard
                              key={idx}
                              evt={evt}
                              eventJson={eventJson}
                              isLong={isLong}
                              onMap={() => {
                                setReceivedPayload(
                                  evt.payload || evt.data || evt,
                                );
                                handleOpenMapper();
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ) : isListening ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mb-3">
                        <Radio className="w-5 h-5 text-primary/50 animate-pulse" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Waiting for incoming events...
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Send a request to your webhook URL to see it appear here
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {/* Field Mapping Section */}
            {showMapper && (
              <FieldMapper
                sourceFields={sourceFields}
                targetFields={targetFields}
                mappingData={mappingData}
                firsLoading={firsLoading}
                onAddMapping={addFieldMapping}
                onRemoveBySource={removeFieldMappingBySource}
                onRemoveByTarget={removeFieldMappingByTarget}
                onClearAll={() => setMappingData([])}
                onSave={handleSaveFieldMappings}
                saving={savingFieldMappings}
                onClose={() => setShowMapper(false)}
              />
            )}
          </TabsContent>

          {/* ===== TAB 4: History ===== */}
          <TabsContent value="history" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Activity className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle>Webhook History</CardTitle>
                      <CardDescription>
                        All webhook events processed for your tenant
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchWebhookEvents(historyPage, historyPageSize, historySearch)}
                    disabled={historyLoading}
                  >
                    <RefreshCw
                      className={`w-4 h-4 mr-2 ${historyLoading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={webhookHistory}
                  columns={historyColumns}
                  isLoading={historyLoading}
                  emptyMessage="No webhook events found. Events will appear here after invoices are processed."
                  onRowClick={(evt) => fetchWebhookEventDetail(evt)}
                  searchPlaceholder="Search by event type, status, or IRN..."
                  currentPage={historyPage}
                  totalItems={historyTotal}
                  pageSize={historyPageSize}
                  onPageChange={(p) => setHistoryPage(p)}
                  onPageSizeChange={(s) => {
                    setHistoryPageSize(s);
                    setHistoryPage(1);
                  }}
                  onSearch={(q) => {
                    if (historySearchDebounceRef.current)
                      clearTimeout(historySearchDebounceRef.current);
                    historySearchDebounceRef.current = setTimeout(() => {
                      setHistorySearch(q);
                      setHistoryPage(1);
                    }, 400);
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Generate/Regenerate Webhook Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{webhookConfig ? "Regenerate Webhook" : "Generate Webhook"}</DialogTitle>
            <DialogDescription>
              Choose how long the new URL and secret should remain valid.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Lifespan</Label>
              <Select value={selectedLifespan} onValueChange={setSelectedLifespan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIFESPAN_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {webhookConfig && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs space-y-1">
                  <p>
                    This action is <strong>irreversible</strong> and will invalidate the current
                    webhook URL and secret, revoke all existing event routing configurations, and
                    break any external systems using the current credentials.
                  </p>
                  <p>Update all connected ERPs and external systems with the new credentials after regenerating.</p>
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button
              variant={webhookConfig ? "destructive" : "default"}
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {webhookConfig ? "Yes, Regenerate" : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* JSON Viewer Dialog */}
      <Dialog open={!!viewingJson} onOpenChange={() => setViewingJson(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle>{viewingJson?.title}</DialogTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(stringifyJson(viewingJson?.data));
                  toast.success("Copied to clipboard");
                }}
              >
                <Copy className="w-3 h-3 mr-2" />
                Copy
              </Button>
            </div>
          </DialogHeader>
          <ScrollArea className="h-[calc(85vh-8rem)] mt-2">
            {viewingJson?.title === "Metadata" ? (
              <KeyValueTable data={viewingJson?.data} />
            ) : (
              <JsonBlock data={viewingJson?.data} className="max-h-none" />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog
        open={!!selectedEvent}
        onOpenChange={() => setSelectedEvent(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Webhook Event Details</DialogTitle>
            <DialogDescription>
              {selectedEvent?.eventType} :{" "}
              {selectedEvent?.irn || "N/A"}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Event Type
                  </p>
                  <p className="text-sm font-mono">{selectedEvent.eventType}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Status
                  </p>
                  <StatusBadge status={selectedEvent.status} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Invoice IRN
                  </p>
                  <p className="text-sm font-mono">
                    {selectedEvent.irn || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Timestamp
                  </p>
                  <p className="text-sm">
                    {selectedEvent.createdAt
                      ? format(new Date(selectedEvent.createdAt), "PPpp")
                      : "N/A"}
                  </p>
                </div>
                {selectedEvent.eventId && (
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Event ID
                    </p>
                    <p className="text-sm font-mono">{selectedEvent.eventId}</p>
                  </div>
                )}
              </div>

              {historyDetailLoading && !selectedEvent.payload && (
                <div className="flex items-center gap-2 py-1 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Loading event details...</span>
                </div>
              )}

              {selectedEvent.failureReason && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {selectedEvent.failureReason}
                  </AlertDescription>
                </Alert>
              )}

              {selectedEvent.jobErrors && selectedEvent.jobErrors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Job Errors
                  </p>
                  <div className="space-y-2">
                    {selectedEvent.jobErrors.map((err, i) => (
                      <div
                        key={i}
                        className="text-xs p-3 rounded-lg border bg-destructive/5 border-destructive/20 space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-[10px]">
                            {err.action}
                          </Badge>
                          <span className="text-muted-foreground">
                            {format(new Date(err.failedAt), "PPpp")}
                          </span>
                        </div>
                        <p className="font-mono text-destructive">{err.error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedEvent.payload && (
                <div className="space-y-2 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    Payload
                  </p>
                  <JsonBlock data={selectedEvent.payload} className="max-h-[200px]" />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setViewingJson({
                          title: "Payload",
                          data: selectedEvent.payload,
                        })
                      }
                    >
                      <Eye className="w-3 h-3 mr-2" />
                      View Full Payload
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReceivedPayload(selectedEvent.payload);
                        setSelectedEvent(null);
                        setActiveTab("test");
                        handleOpenMapper();
                      }}
                    >
                      <Link2 className="w-3 h-3 mr-2" />
                      Map this Payload
                    </Button>
                  </div>
                </div>
              )}

              {selectedEvent.metadata && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Metadata
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setViewingJson({
                        title: "Metadata",
                        data: selectedEvent.metadata,
                      })
                    }
                  >
                    <Eye className="w-3 h-3 mr-2" />
                    View Metadata
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ===== Field Mapper Component =====

function FieldMapper({
  sourceFields,
  targetFields,
  mappingData,
  firsLoading,
  onAddMapping,
  onRemoveBySource,
  onRemoveByTarget,
  onClearAll,
  onSave,
  saving,
  onClose,
}: {
  sourceFields: { key: string; type: string }[];
  targetFields: {
    key: string;
    type: string;
    required?: boolean;
    description?: string;
  }[];
  mappingData: MappingRule[];
  firsLoading: boolean;
  onAddMapping: (source: string, target: string) => void;
  onRemoveBySource: (source: string) => void;
  onRemoveByTarget: (target: string) => void;
  onClearAll: () => void;
  onSave: () => void;
  saving: boolean;
  onClose: () => void;
}) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [sourceSearch, setSourceSearch] = useState("");
  const [targetSearch, setTargetSearch] = useState("");

  const filteredSource = useMemo(() => {
    if (!sourceSearch) return sourceFields;
    const q = sourceSearch.toLowerCase();
    return sourceFields.filter((f) => f.key.toLowerCase().includes(q));
  }, [sourceSearch, sourceFields]);

  const filteredTarget = useMemo(() => {
    if (!targetSearch) return targetFields;
    const q = targetSearch.toLowerCase();
    return targetFields.filter((f) => f.key.toLowerCase().includes(q));
  }, [targetSearch, targetFields]);

  const getMappingsForSource = (key: string) =>
    mappingData.filter((m) => m.source === key);
  const getMappingsForTarget = (key: string) =>
    mappingData.filter((m) => m.target === key);

  // Auto-connect when both source and target are selected
  useEffect(() => {
    if (selectedSource && selectedTarget) {
      onAddMapping(selectedSource, selectedTarget);
      setSelectedSource(null);
      setSelectedTarget(null);
    }
  }, [selectedSource, selectedTarget]);

  if (firsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-3" />
          <span className="text-muted-foreground">
            Loading NRS schema fields...
          </span>
        </CardContent>
      </Card>
    );
  }

  if (sourceFields.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Link2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Source Fields</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Send a test payload or paste a JSON payload above to generate source
            fields for mapping.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (targetFields.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileJson className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">NRS Schema Not Found</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            The NRS UBL Invoice Schema has not been configured yet. Ask your
            admin to set it up from the NRS Dictionary page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Field Mapping</CardTitle>
            <CardDescription>
              Click a source field, then click a target field to create a
              mapping
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button size="sm" onClick={onSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Mappings"
              )}
            </Button>
          </div>
        </div>

        {/* Mapping stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
          <span>{sourceFields.length} source fields</span>
          <span>-</span>
          <span>{targetFields.length} target fields</span>
          <span>-</span>
          <Badge variant="secondary">{mappingData.length} mappings</Badge>
          {mappingData.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onClearAll}
            >
              <Unlink className="w-3 h-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* Source Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Server className="w-4 h-4" />
                Webhook Payload Fields
              </CardTitle>
              <Input
                placeholder="Search source fields..."
                value={sourceSearch}
                onChange={(e) => setSourceSearch(e.target.value)}
                className="mt-2"
              />
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="space-y-0.5 p-3">
                  {filteredSource.map((field) => {
                    const mappings = getMappingsForSource(field.key);
                    const isMapped = mappings.length > 0;
                    const isSelected = selectedSource === field.key;
                    return (
                      <div
                        key={field.key}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors text-sm group",
                          isSelected &&
                            "bg-primary/10 border border-primary/30",
                          isMapped &&
                            !isSelected &&
                            "bg-success/5 border border-success/20",
                          !isMapped &&
                            !isSelected &&
                            "hover:bg-muted/50 border border-transparent",
                        )}
                        onClick={() =>
                          setSelectedSource(isSelected ? null : field.key)
                        }
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <code className="text-xs font-mono truncate">
                            {field.key}
                          </code>
                          <Badge
                            variant="outline"
                            className="text-[10px] shrink-0"
                          >
                            {field.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isMapped && (
                            <Badge variant="secondary" className="text-[10px]">
                              {mappings.length}
                            </Badge>
                          )}
                          {isMapped && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveBySource(field.key);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 rounded"
                            >
                              <Unlink className="w-3 h-3 text-destructive" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Target Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileJson className="w-4 h-4" />
                NRS UBL Fields
              </CardTitle>
              <Input
                placeholder="Search target fields..."
                value={targetSearch}
                onChange={(e) => setTargetSearch(e.target.value)}
                className="mt-2"
              />
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="space-y-0.5 p-3">
                  {filteredTarget.map((field) => {
                    const mappings = getMappingsForTarget(field.key);
                    const isMapped = mappings.length > 0;
                    const isSelected = selectedTarget === field.key;
                    return (
                      <div
                        key={field.key}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors text-sm group",
                          isSelected &&
                            "bg-primary/10 border border-primary/30",
                          isMapped &&
                            !isSelected &&
                            "bg-success/5 border border-success/20",
                          !isMapped &&
                            !isSelected &&
                            "hover:bg-muted/50 border border-transparent",
                        )}
                        onClick={() =>
                          setSelectedTarget(isSelected ? null : field.key)
                        }
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <code className="text-xs font-mono truncate">
                            {field.key}
                          </code>
                          <Badge
                            variant="outline"
                            className="text-[10px] shrink-0"
                          >
                            {field.type}
                          </Badge>
                          {field.required && (
                            <Badge
                              variant="destructive"
                              className="text-[10px] shrink-0"
                            >
                              req
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isMapped && (
                            <Badge variant="secondary" className="text-[10px]">
                              {mappings.length}
                            </Badge>
                          )}
                          {isMapped && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveByTarget(field.key);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 rounded"
                            >
                              <Unlink className="w-3 h-3 text-destructive" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Current mappings summary */}
        {mappingData.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-3">
              Current Mappings ({mappingData.length})
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
              {mappingData.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs p-2 rounded border bg-muted/30"
                >
                  <code className="font-mono truncate flex-1">{m.source}</code>
                  <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                  <code className="font-mono truncate flex-1">{m.target}</code>
                  <button
                    onClick={() => onRemoveBySource(m.source)}
                    className="p-0.5 hover:bg-destructive/10 rounded shrink-0"
                  >
                    <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
