"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { PostalAddressFields } from "@/components/shared";
import { createTenantApi } from "@/lib/api/tenant-api";
import type { OnboardingProfilePayload } from "@/types/tenant-profile";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

// TIN is intentionally not part of this form — it's never edited from the UI.
const businessProfileSchema = z.object({
  party_name: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(200, "Business name must be at most 200 characters"),
  email: z.string().email("Enter a valid email address"),
  telephone: z
    .string()
    .min(7, "Telephone must be at least 7 characters")
    .max(25, "Telephone must be at most 25 characters"),
  business_description: z.string().optional(),
  postal_address: z.object({
    street_name: z.string().optional(),
    city_name: z.string().optional(),
    postal_zone: z.string().optional(),
    lga: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
  }),
});

type BusinessProfileFormValues = z.infer<typeof businessProfileSchema>;

interface BusinessProfileStepProps {
  tenantId: string;
  onStepComplete: () => void | Promise<void>;
}

/** Drops empty strings so the backend's min-length rules never see "". */
function buildPayload(data: BusinessProfileFormValues): OnboardingProfilePayload {
  const address = Object.fromEntries(
    Object.entries(data.postal_address).filter(([, v]) => !!v),
  );

  return {
    party_name: data.party_name,
    email: data.email,
    telephone: data.telephone,
    ...(data.business_description?.trim()
      ? { business_description: data.business_description.trim() }
      : {}),
    ...(Object.keys(address).length > 0
      ? { postal_address: { country: "NG", ...address } }
      : {}),
  };
}

export function BusinessProfileStep({
  tenantId,
  onStepComplete,
}: BusinessProfileStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const form = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      party_name: "",
      email: "",
      telephone: "",
      business_description: "",
      postal_address: {
        street_name: "",
        city_name: "",
        postal_zone: "",
        lga: "",
        state: "",
        country: "NG",
      },
    },
  });

  const onSubmit = async (data: BusinessProfileFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await createTenantApi().updateOnboardingProfile(
        tenantId,
        buildPayload(data),
      );

      if (response.error) {
        const errorMessage =
          (response.error as any)?.value?.error ||
          "Failed to save business profile";
        setError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      setIsComplete(true);
      toast.success("Business profile saved!");
      onStepComplete();
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to save business profile";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <Alert className="border-success bg-success/10">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <AlertDescription className="text-success">
          Your business profile has been saved.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Business Profile
        </h3>
        <p className="text-sm text-muted-foreground">
          Tell us more about your business. These details appear on the
          invoices you issue.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="party_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Name</FormLabel>
                <FormControl>
                  <Input placeholder="Registered business name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="billing@company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telephone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telephone</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. +2348012345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="business_description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="What does your business do?"
                    className="min-h-[90px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>Optional</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3">
            <p className="text-sm font-medium">Postal Address</p>
            <PostalAddressFields prefix="postal_address" />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving profile...
              </>
            ) : (
              <>
                Save & Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
