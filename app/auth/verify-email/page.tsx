'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSession } from '@/hooks/use-session'
import { createTenantApi } from '@/lib/api/tenant-api'

type Status = 'loading' | 'success' | 'error' | 'missing-token' | 'unauthenticated'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { tenantId, isAuthenticated, isLoading: sessionLoading } = useSession()

  const token = searchParams.get('_u') || searchParams.get('token')

  const [status, setStatus] = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [newEmail, setNewEmail] = useState('')

  useEffect(() => {
    if (sessionLoading) return

    if (!token) {
      setStatus('missing-token')
      return
    }

    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(`/auth/verify-email?_u=${token}`)
      router.replace(`/auth/login?next=${returnUrl}`)
      return
    }

    if (!tenantId) return

    const verify = async () => {
      try {
        const api = createTenantApi()
        const response = await api.verifyEmailChange(tenantId, token)
        if (response.error) {
          setErrorMessage(
            (response.error as any)?.value?.error || 'Verification link has expired or is invalid.'
          )
          setStatus('error')
          return
        }
        const updatedEmail = (response.data as any)?.data?.contactEmail
        if (updatedEmail) setNewEmail(updatedEmail)
        setStatus('success')
      } catch (err: any) {
        setErrorMessage(err?.message || 'Verification link has expired or is invalid.')
        setStatus('error')
      }
    }

    verify()
  }, [token, isAuthenticated, sessionLoading, tenantId, router])

  if (status === 'loading') {
    return (
      <Card className="w-full max-w-md mx-4">
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying your new email address…</p>
        </CardContent>
      </Card>
    )
  }

  if (status === 'missing-token') {
    return (
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <XCircle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle>Invalid Link</CardTitle>
          <CardDescription>
            This verification link is missing the required token. Make sure you copied the full link from your email.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild variant="outline">
            <Link href="/dashboard/profile">Go to Profile</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (status === 'error') {
    return (
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <XCircle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle>Verification Failed</CardTitle>
          <CardDescription>{errorMessage}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <p className="text-xs text-muted-foreground text-center">
            Verification links expire after 12 hours. You can request a new one from your profile.
          </p>
          <Button asChild variant="outline">
            <Link href="/dashboard/profile">Go to Profile</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-4">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <CheckCircle className="h-12 w-12 text-success" />
        </div>
        <CardTitle>Email Updated</CardTitle>
        <CardDescription>
          Your contact email has been successfully updated
          {newEmail && <> to <span className="font-medium text-foreground">{newEmail}</span></>}.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button asChild>
          <Link href="/dashboard/profile">Go to Profile</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
