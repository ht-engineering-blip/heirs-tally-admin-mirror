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
  email: z.string().email('Valid NRS email required'),
  password: z.string().min(1, 'NRS password is required'),
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

export function NrsOAuthStep({ tenantId, onStepComplete }: FirsOAuthStepProps) {
  const [error, setError] = useState<string | null>(null)
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [useMock, setUseMock] = useState(false)

  const form = useForm<FirsOAuthFormValues>({
    resolver: zodResolver(firsOAuthSchema),
    defaultValues: { email: '', password: '' },
  })

  const handleMockToggle = (checked: boolean) => {
    setUseMock(checked)
    if (checked) {
      form.setValue('email', 'test@email.co')
      form.setValue('password', 'Password@123')
    } else {
      form.setValue('email', '')
      form.setValue('password', '')
    }
  }

  const runAuth = async (email: string, password: string, mock: boolean) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const tenantApi = createTenantApi()
      const response = await tenantApi.firsOAuth(email, password, mock)
      if (response.error || response.data.error) {
        const errorMessage = (response.error as any)?.value?.error || response.data.error  || 'NRS authentication failed'
        setError(errorMessage)
        toast.error(errorMessage)
        setIsSubmitting(false)
        return
      }

      const responseData = (response.data as any)?.data
      if (!responseData?.business) {
        setError('Unexpected response from NRS')
        toast.error('Unexpected response from NRS')
        setIsSubmitting(false)
        return
      }

      setBusinessInfo(responseData.business)
      toast.success('NRS authentication successful!')
      onStepComplete()
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to authenticate with NRS'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSubmit = async (data: FirsOAuthFormValues) => {
    await runAuth(data.email, data.password, useMock)
  }

  if (businessInfo) {
    return (
      <div className="space-y-4">
        <Alert className="border-success bg-success/10">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            NRS authentication successful! Your business has been verified.
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
        <h3 className="text-lg font-semibold">NRS Authentication</h3>
        <p className="text-sm text-muted-foreground">
          Enter your NRS portal credentials to verify your business and fetch your Business ID.
        </p>
      </div>

      {isDev && (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-3 dark:border-amber-600 dark:bg-amber-950/30">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <FlaskConical className="h-4 w-4 shrink-0" />
            <span className="font-medium">Use mock NRS credentials</span>
            <span className="text-amber-600/70 dark:text-amber-500/70">(dev only)</span>
          </div>
          <Switch
            checked={useMock}
            onCheckedChange={handleMockToggle}
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>NRS Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="your-nrs-email@example.com"
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
                <FormLabel>NRS Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Enter your NRS password"
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
                Authenticating with NRS...
              </>
            ) : (
              <>
                Authenticate with NRS
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
