'use client';

import { useState } from 'react';
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { getAdminApiClient } from '@/lib/api/client';

/** Admin tool for POST /v1/tenants/:tenantId/reset-onboarding — un-sticks a tenant by resetting them to ONBOARDING and clearing the 5 onboarding steps. Shared between the Tenants list and Tenant Detail pages. */
export function ResetOnboardingDialog({
  open,
  onOpenChange,
  tenantId,
  businessName,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  businessName?: string;
  onSuccess?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [clearCredentials, setClearCredentials] = useState(false);
  const [reason, setReason] = useState('');

  const handleReset = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const adminApi = getAdminApiClient();
      const response = await (adminApi as any).v1.tenants({ tenantId })['reset-onboarding'].post({
        clearCredentials,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to reset onboarding');
      } else {
        toast.success('Onboarding reset — the tenant can sign in and resume from NRS Auth');
        onOpenChange(false);
        setClearCredentials(false);
        setReason('');
        onSuccess?.();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to reset onboarding');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset Onboarding
          </DialogTitle>
          <DialogDescription>
            Resets <strong>{businessName || 'this tenant'}</strong> to onboarding status and clears the 5 onboarding
            steps so they can resume from NRS Auth. Only use this to un-stick a tenant — e.g. one caught by the auth
            token bug.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="reset-onboarding-clear-credentials">Also clear FIRS credentials</Label>
              <p className="text-xs text-muted-foreground">
                Wipes businessId and the entire FIRS credentials object. Only enable this when the credentials
                themselves are actually broken — otherwise leave it off so they&apos;re preserved.
              </p>
            </div>
            <Switch
              id="reset-onboarding-clear-credentials"
              checked={clearCredentials}
              onCheckedChange={setClearCredentials}
            />
          </div>
          {clearCredentials && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This tenant will need to fully redo FIRS credential setup — their businessId and FIRS certificate/key
                will be gone.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="reset-onboarding-reason">Reason (optional, for the audit log)</Label>
            <Textarea
              id="reset-onboarding-reason"
              placeholder="e.g. Tenant stuck in login/401 loop from the auth token bug"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[70px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleReset} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Reset Onboarding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
