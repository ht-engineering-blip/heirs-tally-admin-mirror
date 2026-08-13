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
import { toast } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createTenantApi } from "@/lib/api/tenant-api";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FlaskConical,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const environmentsVal = {
  development: "development",
  production: "production",
};

const isDev =
  process.env.NEXT_PUBLIC_APP_ENV === environmentsVal.development ||
  process.env.NODE_ENV === environmentsVal.development;

const firsCredentialsSchema = z.object({
  certificate: z.string().min(1, "Certificate is required"),
  publicKey: z.string().min(1, "Public key is required"),
});

type FirsCredentialsFormValues = z.infer<typeof firsCredentialsSchema>;

interface FirsCredentialsStepProps {
  tenantId: string;
  onStepComplete: () => void | Promise<void>;
}

export function NrsCredentialsStep({
  tenantId,
  onStepComplete,
}: FirsCredentialsStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [useMock, v] = useState(false);

  const form = useForm<FirsCredentialsFormValues>({
    resolver: zodResolver(firsCredentialsSchema),
    defaultValues: { certificate: "", publicKey: "" },
  });

  const onMockSubmit = () => {
    toast.success("NRS credentials skipped (mock mode)");
    onStepComplete();
  };

  const onSubmit = async (data: FirsCredentialsFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const tenantApi = createTenantApi();
      const response = await tenantApi.putFirsCredentials(
        tenantId,
        data.certificate,
        data.publicKey,
      );

      if (response.error) {
        const errorMessage =
          (response.error as any)?.value?.error ||
          "Failed to save NRS credentials";
        setError(errorMessage);
        toast.error(errorMessage);
        setIsSubmitting(false);
        return;
      }

      const responseData = (response.data as any)?.data;
      if (!responseData) {
        setError("Unexpected response");
        toast.error("Unexpected response");
        setIsSubmitting(false);
        return;
      }

      setIsComplete(true);
      toast.success("NRS credentials configured successfully!");
      onStepComplete();
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to save NRS credentials";
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
          NRS credentials have been configured successfully.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          NRS Credentials
        </h3>
        <p className="text-sm text-muted-foreground">
          Provide your NRS certificate and public key for invoice signing. Paste
          the PEM-encoded content below.
        </p>
      </div>

      {isDev && (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-3 dark:border-amber-600 dark:bg-amber-950/30">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <FlaskConical className="h-4 w-4 shrink-0" />
            <span className="font-medium">Skip NRS credentials</span>
            <span className="text-amber-600/70 dark:text-amber-500/70">
              (dev only)
            </span>
          </div>
          <Switch
            checked={useMock}
            onCheckedChange={v}
            aria-label="Toggle mock mode"
            className="data-[state=unchecked]:dark:bg-amber-800"
          />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {useMock ? (
        <div className="space-y-4">
          <Alert className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
            <FlaskConical className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              Mock mode is active. NRS credential validation will be skipped —
              no real certificate or key needed.
            </AlertDescription>
          </Alert>
          <Button className="w-full" onClick={onMockSubmit}>
            <FlaskConical className="mr-2 h-4 w-4" />
            Continue with Mock Credentials
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="certificate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certificate</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                      className="font-mono text-xs min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Paste your PEM-encoded NRS certificate
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="publicKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Public Key</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
                      className="font-mono text-xs min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Paste your PEM-encoded public key
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving credentials...
                </>
              ) : (
                <>
                  Save Credentials
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
