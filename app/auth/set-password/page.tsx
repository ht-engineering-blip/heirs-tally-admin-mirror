'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, ArrowRight, ArrowLeft, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import { getTenantApiClient } from '@/lib/api/client'

const setPasswordSchema = z.object({
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

type SetPasswordFormValues = z.infer<typeof setPasswordSchema>

export default function SetPasswordPageWrapper() {
  return (
    <Suspense>
      <SetPasswordPage />
    </Suspense>
  )
}

function SetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const api = getTenantApiClient()
  const form = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: SetPasswordFormValues) => {
    if (!token) {
      setError('Invalid or missing token')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Call set-password endpoint with token in query parameter
      const setPasswordResponse = await api.v1.auth['set-password'].post({ password: data.password },{
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (setPasswordResponse.error) {
        const errorMessage = (setPasswordResponse.error as any)?.value?.error || 'Failed to set password'
        setError(errorMessage)
        toast.error(errorMessage)
        setIsLoading(false)
        return
      }

      if (!setPasswordResponse.data?.data?.token) {
        setError('Failed to get authentication token')
        toast.error('Failed to authenticate')
        setIsLoading(false)
        return
      }

      const authToken = setPasswordResponse.data.data.token
      // Set access_token cookie so the API proxy can read it directly
      document.cookie = `access_token=${authToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`

      // Call /me endpoint to get user information 
      const meResponse = await api.v1.auth.me.get({ headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      }})

      if (meResponse.error || !meResponse.data?.data) {
        setError('Failed to get user information')
        toast.error('Failed to authenticate')
        setIsLoading(false)
        return
      }

      const userData = meResponse.data.data

      // Determine user role based on response type
      let userRole: string = 'BUSINESS_ADMIN'
      if ('role' in userData) {
        userRole = userData.role
      } else if ('type' in userData && userData.type === 'tenant') {
        userRole = 'BUSINESS_ADMIN'
      }

      // Extract tenantId from /me response
      const tenantId = 'id' in userData && 'type' in userData && (userData as any).type === 'tenant'
        ? (userData as any).id
        : 'tenantId' in userData
          ? (userData as any).tenantId
          : undefined

      // Sign in with NextAuth, including the auth token and tenantId
      const result = await signIn('credentials', {
        token: authToken,
        email: 'email' in userData ? userData.email : 'id' in userData ? userData.id : '',
        name: 'firstName' in userData && 'lastName' in userData
          ? `${userData.firstName} ${userData.lastName}`
          : 'businessName' in userData
            ? userData.businessName
            : 'User',
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

      toast.success('Password set successfully!')

      // Redirect based on role
      window.location.href = userRole === 'SUPER_ADMIN' ? '/admin' : '/dashboard'
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to set password. Please try again.'
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
            <CardTitle className="text-2xl font-bold">Invalid Token</CardTitle>
            <CardDescription>
              The token is missing or invalid. Please request a new link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Invalid or missing token. Please request a new password setup link.
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
              <Lock className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Set your password</CardTitle>
          <CardDescription>
            Create a secure password for your account
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
                    Setting password...
                  </>
                ) : (
                  <>
                    Set password
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
