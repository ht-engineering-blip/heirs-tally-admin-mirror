'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowRight, AlertCircle, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { createTenantApi } from '@/lib/api/tenant-api'

const firsCredentialsSchema = z.object({
  certificate: z.string().min(1, 'Certificate is required'),
  publicKey: z.string().min(1, 'Public key is required'),
})

type FirsCredentialsFormValues = z.infer<typeof firsCredentialsSchema>

interface FirsCredentialsStepProps {
  tenantId: string
  onStepComplete: () => void
}

export function FirsCredentialsStep({ tenantId, onStepComplete }: FirsCredentialsStepProps) {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const form = useForm<FirsCredentialsFormValues>({
    resolver: zodResolver(firsCredentialsSchema),
    defaultValues: { certificate: '', publicKey: '' },
  })

  const onSubmit = async (data: FirsCredentialsFormValues) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const tenantApi = createTenantApi()
      const response = await tenantApi.putFirsCredentials(tenantId, data.certificate, data.publicKey)

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || 'Failed to save FIRS credentials'
        setError(errorMessage)
        toast.error(errorMessage)
        setIsSubmitting(false)
        return
      }

      const responseData = (response.data as any)?.data
      if (!responseData) {
        setError('Unexpected response')
        toast.error('Unexpected response')
        setIsSubmitting(false)
        return
      }

      setIsComplete(true)
      toast.success('FIRS credentials configured successfully!')
      onStepComplete()
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to save FIRS credentials'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isComplete) {
    return (
      <Alert className="border-success bg-success/10">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <AlertDescription className="text-success">
          FIRS credentials have been configured successfully.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          FIRS Credentials
        </h3>
        <p className="text-sm text-muted-foreground">
          Provide your FIRS certificate and public key for invoice signing. Paste the PEM-encoded content below.
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
                  Paste your PEM-encoded FIRS certificate
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
    </div>
  )
}
