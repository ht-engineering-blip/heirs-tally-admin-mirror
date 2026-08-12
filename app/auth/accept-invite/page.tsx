'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import { getTenantApiClient } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Lock, UserPlus } from 'lucide-react'
import Cookies from 'js-cookie'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

const acceptInviteSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type AcceptInviteFormValues = z.infer<typeof acceptInviteSchema>

export default function AcceptInvitePageWrapper() {
  return (
    <Suspense>
      <AcceptInvitePage />
    </Suspense>
  )
}

function AcceptInvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const api = getTenantApiClient()
  const form = useForm<AcceptInviteFormValues>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: AcceptInviteFormValues) => {
    if (!token) {
      setError('Invalid or missing invite token')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Call accept-invite endpoint
      const acceptInviteResponse = await api.v1.team['accept-invite']({ token }).post({
        password: data.password,
      })

      if (acceptInviteResponse.error) {
        const errorMessage = (acceptInviteResponse.error as any)?.value?.error || 'Failed to accept invite'
        setError(errorMessage)
        toast.error(errorMessage)
        setIsLoading(false)
        return
      }

      if (!acceptInviteResponse.data?.data?.token) {
        setError('Failed to get authentication token')
        toast.error('Failed to authenticate')
        setIsLoading(false)
        return
      }

      const authToken = acceptInviteResponse?.data?.data?.token
      Cookies.set('access_token', authToken, { expires: 7, path: '/', sameSite: 'lax' })
      const userData = acceptInviteResponse?.data?.data

      // Call /me endpoint to get additional user information using fetch
      const API_URL = typeof window !== 'undefined'
        ? `${window.location.origin}/api/v1`
        : '/api/v1'

      const meRes = await fetch(`${API_URL}/v1/auth/me`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        credentials: 'include',
      })
      const meJson = meRes.ok ? await meRes.json() : null
      const meResponse = {
        error: !meRes.ok,
        data: meJson,
      }

      if (meResponse.error || !meResponse.data?.data) {
        // If /me fails, use data from accept-invite response
        const userRole = userData.role || 'BUSINESS_TEAM_MEMBER'

        const result = await signIn('credentials', {
          token: authToken,
          email: userData.email,
          name: `${userData.firstName} ${userData.lastName}`,
          role: userRole,
          tenantId: (userData as any)?.tenantId,
          redirect: false,
        })

        if (result?.error) {
          setError('Failed to sign in. Please try logging in manually.')
          toast.error('Authentication failed')
          setIsLoading(false)
          return
        }

        toast.success('Invite accepted successfully!')
        window.location.href = '/dashboard'
        return
      }

      const fullUserData = meResponse.data.data
      const userRole = 'role' in fullUserData ? fullUserData.role : userData.role || 'BUSINESS_TEAM_MEMBER'

      // Extract tenantId from /me response
      const tenantId = 'tenantId' in fullUserData
        ? (fullUserData as any).tenantId
        : 'id' in fullUserData && 'type' in fullUserData && (fullUserData as any).type === 'tenant'
          ? (fullUserData as any).id
          : (userData as any)?.tenantId

      // Sign in with NextAuth, including the auth token and tenantId
      const result = await signIn('credentials', {
        token: authToken,
        email: 'email' in fullUserData ? fullUserData.email : userData.email,
        name: 'firstName' in fullUserData && 'lastName' in fullUserData
          ? `${fullUserData.firstName} ${fullUserData.lastName}`
          : `${userData.firstName} ${userData.lastName}`,
        role: userRole,
        tenantId: tenantId,
        redirect: false,
      })

      if (result?.error) {
        setError('Failed to sign in. Please try logging in manually.')
        toast.error('Authentication failed')
        setIsLoading(false)
        return
      }

      toast.success('Invite accepted successfully!')

      // Redirect based on role
      window.location.href = userRole === 'SUPER_ADMIN' ? '/admin' : '/dashboard'
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to accept invite. Please try again.'
      setError(errorMessage)
      toast.error(errorMessage)
      setIsLoading(false)
    }
  }

  const password = form.watch('password')
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { strength: 0, label: '', bgColor: '', textColor: '' }
    let strength = 0
    if (pwd.length >= 8) strength++
    if (/[A-Z]/.test(pwd)) strength++
    if (/[a-z]/.test(pwd)) strength++
    if (/[0-9]/.test(pwd)) strength++
    if (/[^A-Za-z0-9]/.test(pwd)) strength++
    
    if (strength <= 2) return { strength, label: 'Weak', bgColor: 'bg-destructive', textColor: 'text-destructive' }
    if (strength <= 4) return { strength, label: 'Medium', bgColor: 'bg-warning', textColor: 'text-warning' }
    return { strength, label: 'Strong', bgColor: 'bg-success', textColor: 'text-success' }
  }

  const passwordStrength = getPasswordStrength(password)

  if (!token) {
    return (
      <div className="w-full p-4 min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Invalid Invite</CardTitle>
            <CardDescription>
              The invite token is missing or invalid. Please request a new invite.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Invalid or missing invite token. Please contact your administrator for a new invite.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Link href="/auth/login" className="w-full">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full p-4 min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Accept Invitation</CardTitle>
          <CardDescription>
            Create a password to accept your team invitation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          className="pl-10 pr-10"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    {password && (
                      <div className="space-y-1">
                        <div className="flex gap-1 h-1.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className={cn(
                                'flex-1 rounded-full transition-colors',
                                i <= passwordStrength.strength
                                  ? passwordStrength.bgColor
                                  : 'bg-muted'
                              )}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Password strength: <span className={cn('font-medium', passwordStrength.textColor)}>{passwordStrength.label}</span>
                        </p>
                      </div>
                    )}
                    <FormDescription>
                      Must be at least 8 characters with uppercase, lowercase, and number
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm your password"
                          className="pl-10 pr-10"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting invite...
                  </>
                ) : (
                  <>
                    Accept Invitation
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          <Link href="/auth/login" className="w-full">
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
