'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/sonner'
import { formatErpName } from '@/hooks/use-supported-erps'
import { createTenantApi } from '@/lib/api/tenant-api'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowRight, Building2, CheckCircle2, FlaskConical, Loader2, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

const isDev = process.env.NEXT_PUBLIC_APP_ENV === 'development' || process.env.NODE_ENV === 'development'

const firsOAuthSchema = z.object({
  email: z.string().email('Valid FIRS email required'),
  password: z.string().min(1, 'FIRS password is required'),
})

type FirsOAuthFormValues = z.infer<typeof firsOAuthSchema>

interface FirsOAuthStepProps {
  tenantId: string
  onStepComplete: () => void
}

interface BusinessInfo {
  id: string
  name: string
  tin: string
  sector: string
  erpSystem: string
  isActive: boolean
}

export function FirsOAuthStep({ tenantId, onStepComplete }: FirsOAuthStepProps) {
  const [error, setError] = useState<string | null>(null)
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [useMock, setUseMock] = useState(false)

  const form = useForm<FirsOAuthFormValues>({
    resolver: zodResolver(firsOAuthSchema),
    defaultValues: { email: '', password: '' },
  })

  const runAuth = async (email: string, password: string, mock: boolean) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const tenantApi = createTenantApi()
      const response = await tenantApi.firsOAuth(email, password, mock)
      if (response.error || response.data.error) {
        const errorMessage = (response.error as any)?.value?.error || response.data.error  || 'FIRS authentication failed'
        setError(errorMessage)
        toast.error(errorMessage)
        setIsSubmitting(false)
        return
      }

      const responseData = (response.data as any)?.data
      if (!responseData?.business) {
        setError('Unexpected response from FIRS')
        toast.error('Unexpected response from FIRS')
        setIsSubmitting(false)
        return
      }

      setBusinessInfo(responseData.business)
      toast.success('FIRS authentication successful!')
      onStepComplete()
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to authenticate with FIRS'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSubmit = async (data: FirsOAuthFormValues) => {
    await runAuth(data.email, data.password, false)
  }

  const onMockSubmit = async () => {
    await runAuth('', '', true)
  }

  if (businessInfo) {
    return (
      <div className="space-y-4">
        <Alert className="border-success bg-success/10">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            FIRS authentication successful! Your business has been verified.
          </AlertDescription>
        </Alert>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Business Name</dt>
                <dd className="font-medium">{businessInfo.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">TIN</dt>
                <dd className="font-medium">{businessInfo.tin}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sector</dt>
                <dd className="font-medium">{businessInfo.sector}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">ERP System</dt>
                <dd className="font-medium">{formatErpName(businessInfo.erpSystem)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium">{businessInfo.isActive ? 'Active' : 'Inactive'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">FIRS Authentication</h3>
        <p className="text-sm text-muted-foreground">
          Enter your FIRS portal credentials to verify your business and fetch your Business ID.
        </p>
      </div>

      {isDev && (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-3 dark:border-amber-600 dark:bg-amber-950/30">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <FlaskConical className="h-4 w-4 shrink-0" />
            <span className="font-medium">Use mock FIRS credentials</span>
            <span className="text-amber-600/70 dark:text-amber-500/70">(dev only)</span>
          </div>
          <Switch
            checked={useMock}
            onCheckedChange={setUseMock}
            aria-label="Toggle mock mode"
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
              Mock mode is active. FIRS test credentials will be used automatically — no real credentials needed.
            </AlertDescription>
          </Alert>
          <Button className="w-full" disabled={isSubmitting} onClick={onMockSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Authenticating with FIRS...
              </>
            ) : (
              <>
                <FlaskConical className="mr-2 h-4 w-4" />
                Authenticate with Mock Credentials
              </>
            )}
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>FIRS Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="your-firs-email@example.com"
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>FIRS Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="Enter your FIRS password"
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating with FIRS...
                </>
              ) : (
                <>
                  Authenticate with FIRS
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </Form>
      )}
    </div>
  )
}
