'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
 
import { toast } from '@/components/ui/sonner'
import { getTenantApiClient } from '@/lib/api/client'

export default function ActivatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activationToken = searchParams.get('_u')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  const api = getTenantApiClient()
  useEffect(() => {
    const activateTenant = async () => {
      if (!activationToken) {
        setError('Invalid or missing activation token')
        setStatus('error')
        return
      }

      try {
        const response = await api.v1.tenants.activate({token: activationToken}).get()

        if (response.error) {
          const errorMessage = (response.error as any)?.value?.error || 'Failed to activate tenant'
          setError(errorMessage)
          setStatus('error')
          toast.error(errorMessage)
          return
        }

        if (response.data?.data) {
          const data = response.data.data
          
          // Check if already activated
          if ('alreadyActivated' in data && data.alreadyActivated) {
            toast.info('Tenant is already activated')
            // Still redirect if redirectUrl is provided
            if ('redirectUrl' in data && data.redirectUrl) {
              window.location.href = data.redirectUrl
              return
            }
            // Otherwise redirect to login
            router.push('/auth/login')
            return
          }

          // If redirectUrl is provided, redirect to it
          if ('redirectUrl' in data && data.redirectUrl) {
            setStatus('success')
            toast.success('Tenant activated successfully!')
            // Use window.location.href for external redirects
            setTimeout(() => {
              window.location.href = data.redirectUrl
            }, 1500)
            return
          }

          // If setPasswordToken is provided, redirect to set-password
          if ('setPasswordToken' in data && data.setPasswordToken) {
            setStatus('success')
            toast.success('Tenant activated successfully!')
            setTimeout(() => {
              router.push(`/auth/set-password?token=${data.setPasswordToken}`)
            }, 1500)
            return
          }

          // Default redirect to login
          setStatus('success')
          toast.success('Tenant activated successfully!')
          setTimeout(() => {
            router.push('/auth/login')
          }, 1500)
        }
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to activate tenant. Please try again.'
        setError(errorMessage)
        setStatus('error')
        toast.error(errorMessage)
      }
    }

    activateTenant()
  }, [activationToken, router])

  return (
    <div className="w-full p-4 min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              {status === 'loading' && <Loader2 className="w-6 h-6 text-primary-foreground animate-spin" />}
              {status === 'success' && <CheckCircle2 className="w-6 h-6 text-primary-foreground" />}
              {status === 'error' && <AlertCircle className="w-6 h-6 text-primary-foreground" />}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && 'Activating Tenant...'}
            {status === 'success' && 'Activation Successful'}
            {status === 'error' && 'Activation Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we activate your tenant account'}
            {status === 'success' && 'Your tenant account has been activated. Redirecting...'}
            {status === 'error' && 'We encountered an error while activating your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'error' && error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {status === 'success' && (
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
  )
}
