"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { toast } from "@/components/ui/sonner";
import { getTenantApiClient } from "@/lib/api/client";

const SLOW_THRESHOLD_MS = 6_000;
const TIMEOUT_MS = 30_000;

export default function ActivatePageWrapper() {
  return (
    <Suspense>
      <ActivatePage />
    </Suspense>
  );
}

function ActivatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activationToken = searchParams.get("_u");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSlow, setIsSlow] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const api = getTenantApiClient();
    const controller = new AbortController();
    abortRef.current = controller;

    if (!activationToken) {
      setError("Invalid or missing activation token");
      setStatus("error");
      return;
    }

    const slowTimer = setTimeout(() => setIsSlow(true), SLOW_THRESHOLD_MS);
    const timeoutTimer = setTimeout(() => {
      controller.abort();
      setError(
        "Activation is taking too long. Please try refreshing the page or contact support if the problem persists.",
      );
      setStatus("error");
    }, TIMEOUT_MS);

    const activateTenant = async () => {
      try {

        const response = await api.v1.tenants
          .activate({ token: activationToken })
          .get();

        clearTimeout(slowTimer);
        clearTimeout(timeoutTimer);

        if (response.error) {
          const errorMessage =
            (response.error as any)?.value?.error ||
            "Failed to activate tenant";
          setError(errorMessage);
          setStatus("error");
          toast.error(errorMessage);
          return;
        }

        if (!response.data?.success) {
          const errorMessage =
            (response.data as any)?.error || "Failed to activate tenant";
          setError(errorMessage);
          setStatus("error");
          toast.error(errorMessage);
          return;
        }

        if (response.data?.data) {
          const data = response.data.data;

          if ("alreadyActivated" in data && data.alreadyActivated) {
            toast.info("Tenant is already activated");
            if ("redirectUrl" in data && data.redirectUrl) {
              window.location.href = data.redirectUrl;
              return;
            }
            router.push("/auth/login");
            return;
          }

          if ("redirectUrl" in data && data.redirectUrl) {
            setStatus("success");
            toast.success("Tenant activated successfully!");
            setTimeout(() => {
              window.location.href = data.redirectUrl;
            }, 1500);
            return;
          }

          if ("setPasswordToken" in data && data.setPasswordToken) {
            setStatus("success");
            toast.success("Tenant activated successfully!");
            setTimeout(() => {
              router.push(`/auth/set-password?token=${data.setPasswordToken}`);
            }, 1500);
            return;
          }

          setStatus("success");
          toast.success("Tenant activated successfully!");
          setTimeout(() => {
            router.push("/auth/login");
          }, 1500);
        }
      } catch (err: any) {
        clearTimeout(slowTimer);
        clearTimeout(timeoutTimer);
        if (controller.signal.aborted) return;
        const errorMessage =
          err?.message || "Failed to activate tenant. Please try again.";
        setError(errorMessage);
        setStatus("error");
        toast.error(errorMessage);
      }
    };

    activateTenant();

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(timeoutTimer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activationToken]);

  return (
    <div className="w-full p-4 min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              {status === "loading" && (
                <Loader2 className="w-6 h-6 text-primary-foreground animate-spin" />
              )}
              {status === "success" && (
                <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
              )}
              {status === "error" && (
                <AlertCircle className="w-6 h-6 text-primary-foreground" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === "loading" && "Activating Tenant..."}
            {status === "success" && "Activation Successful"}
            {status === "error" && "Activation Failed"}
          </CardTitle>
          <CardDescription>
            {status === "loading" &&
              "Please wait while we activate your tenant account"}
            {status === "success" &&
              "Your tenant account has been activated. Redirecting..."}
            {status === "error" &&
              "We encountered an error while activating your account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {status === "loading" && isSlow && (
            <Alert className="border-warning bg-warning/10">
              <Clock className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning-foreground">
                This is taking longer than usual. Activation may involve
                external verification steps — please keep this page open.
              </AlertDescription>
            </Alert>
          )}
          {status === "error" && error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {status === "success" && (
            <Alert className="border-success bg-success/10">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                You will be redirected shortly...
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
