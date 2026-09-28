"use client";

import { PostalAddressFields } from "@/components/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import type {
  BusinessSettingsPayload,
  BusinessSettingsResponse,
} from "@/types/tenant-profile";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

// TIN and business registration number are read-only here (the backend
// rejects TIN edits on this endpoint) — they're displayed, never submitted.
const businessSettingsSchema = z.object({
  businessName: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(200, "Business name must be at most 200 characters"),
  contactEmail: z.string().email("Enter a valid email address"),
  contactPhone: z
    .string()
    .min(7, "Phone must be at least 7 characters")
    .max(25, "Phone must be at most 25 characters"),
  businessDescription: z.string().optional(),
  website: z
    .string()
    .url("Enter a full URL, e.g. https://example.com")
    .optional()
    .or(z.literal("")),
  industry: z.string().optional(),
  postalAddress: z.object({
    street_name: z.string().optional(),
    city_name: z.string().optional(),
    postal_zone: z.string().optional(),
    lga: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
  }),
});

type BusinessSettingsFormValues = z.infer<typeof businessSettingsSchema>;

function toFormValues(data: BusinessSettingsResponse): BusinessSettingsFormValues {
  const a = data.postalAddress ?? {};
  return {
    businessName: data.businessName ?? "",
    contactEmail: data.contactEmail ?? "",
    contactPhone: data.contactPhone ?? "",
    businessDescription: data.businessDescription ?? "",
    website: data.website ?? "",
    industry: data.industry ?? "",
    postalAddress: {
      street_name: a.street_name ?? "",
      city_name: a.city_name ?? "",
      postal_zone: a.postal_zone ?? "",
      lga: a.lga ?? "",
      state: a.state ?? "",
      country: a.country || "NG",
    },
  };
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

type BusinessSettingsResult = { error?: any; data?: { data?: BusinessSettingsResponse } };

interface BusinessInformationTabProps {
  tenantId: string;
  /** Disables all fields — e.g. the current user lacks permission to edit. */
  disabled?: boolean;
  fetchConfig: (tenantId: string) => Promise<BusinessSettingsResult>;
  saveConfig: (tenantId: string, payload: BusinessSettingsPayload) => Promise<BusinessSettingsResult>;
  /** Called after a successful save — e.g. to refetch the parent's tenant record. */
  onSaved?: () => void;
}

/**
 * Business Information form — loads/saves via the dedicated settings/business
 * endpoint (the only one covering description, postal address, website,
 * industry). Client-agnostic via fetchConfig/saveConfig props so the same
 * component serves both the tenant Profile page (createTenantApi(), bearer
 * auth) and the admin Tenant Detail page (getAdminApiClient(), x-admin-key) —
 * the backend's onlyTenantAdmin check explicitly allows admin auth through.
 */
export function BusinessInformationTab({
  tenantId,
  disabled,
  fetchConfig,
  saveConfig,
  onSaved,
}: BusinessInformationTabProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [readOnly, setReadOnly] = useState({ tin: "", registration: "" });

  const form = useForm<BusinessSettingsFormValues>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: toFormValues({}),
  });

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchConfig(tenantId);
      if (res.error) {
        setLoadError(
          (res.error as any)?.value?.error || "Failed to load business information",
        );
        return;
      }
      const data = ((res.data as any)?.data ?? {}) as BusinessSettingsResponse;
      // reset() also re-baselines dirty tracking to the loaded record.
      form.reset(toFormValues(data));
      setReadOnly({
        tin: data.tin ?? "",
        registration: data.businessRegistrationNumber ?? "",
      });
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load business information");
    } finally {
      setLoading(false);
    }
  }, [tenantId, fetchConfig, form]);

  useEffect(() => {
    load();
  }, [load]);

  const onSubmit = async (values: BusinessSettingsFormValues) => {
    if (!tenantId) return;
    const dirty = form.formState.dirtyFields;
    const payload: BusinessSettingsPayload = {};

    // Send only what actually changed.
    if (dirty.businessName) payload.businessName = values.businessName;
    if (dirty.contactEmail) payload.contactEmail = values.contactEmail;
    if (dirty.contactPhone) payload.contactPhone = values.contactPhone;
    if (dirty.businessDescription) payload.businessDescription = values.businessDescription ?? "";
    if (dirty.website) payload.website = values.website ?? "";
    if (dirty.industry) payload.industry = values.industry ?? "";
    if (dirty.postalAddress) {
      payload.postalAddress = Object.fromEntries(
        Object.entries(values.postalAddress).filter(([, v]) => !!v),
      );
    }

    setSaving(true);
    try {
      const res = await saveConfig(tenantId, payload);
      if (res.error) {
        toast.error(
          (res.error as any)?.value?.error || "Failed to update business information",
        );
        return;
      }
      const data = ((res.data as any)?.data ?? {}) as BusinessSettingsResponse;
      form.reset(toFormValues({ ...values, ...data }));
      toast.success("Business information updated");
      onSaved?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update business information");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {loadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-2">
            {loadError}
            <Button variant="outline" size="sm" onClick={load}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Business Details</CardTitle>
          <CardDescription>
            Your TIN and registration number can&apos;t be changed here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <FormSkeleton />
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">TIN</Label>
                    <Input value={readOnly.tin} disabled className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Registration Number</Label>
                    <Input value={readOnly.registration} disabled className="font-mono" />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <Input disabled={disabled} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input type="email" disabled={disabled} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl>
                          <Input disabled={disabled} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="businessDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Description</FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-[90px]"
                          placeholder="What does your business do?"
                          disabled={disabled}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com"
                            disabled={disabled}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Manufacturing"
                            disabled={disabled}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">Postal Address</p>
                  <PostalAddressFields prefix="postalAddress" disabled={disabled} />
                </div>

                {!disabled && (
                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving || !form.formState.isDirty}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
