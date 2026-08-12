'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePersistedTab } from '@/hooks/use-persisted-tab'
import { createTenantApi } from '@/lib/api/tenant-api'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, FileText, Loader2, Lock, Mail } from 'lucide-react'
import Cookies from 'js-cookie'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>
type LoginTab = 'business-admin' | 'team-member'

export default function LoginPageWrapper() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  )
}

function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setPersistedTab] = usePersistedTab('business-admin', 'type')

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  useEffect(() => {
    if (searchParams.get('reset') === 'success') {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 5000)
    }
  }, [searchParams])

  // Edge and Chrome autofill login forms after mount even when autoComplete="off"
  // is set. Resetting after a short delay runs after the browser autofill fires
  // and clears it — without affecting values the user has already typed.
  useEffect(() => {
    const t = setTimeout(() => form.reset({ email: '', password: '' }), 100)
    return () => clearTimeout(t)
  }, [])

  const handleTabChange = (value: string) => {
    setPersistedTab(value)
    setError(null)
  }

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setError(null)
      const tenantApi = createTenantApi()

      const loginResponse = activeTab === 'business-admin'
        ? await tenantApi.login(data.email, data.password)
        : await tenantApi.loginTeamMember(data.email, data.password)

      if (loginResponse.error || (loginResponse.data as any)?.error) {
        const errorMessage = (loginResponse.error as any)?.value?.error || (loginResponse.data as any)?.error || 'Invalid credentials'
        setError(errorMessage)
        toast.error(errorMessage)
        return
      }

      const loginData = (loginResponse.data as any)?.data

      if (!loginData?.token) {
        setError('Failed to authenticate')
        toast.error('Failed to authenticate')
        return
      }

      const authToken = loginData.token
      let tenantId = loginData.tenant?.id

      Cookies.set('access_token', authToken, { expires: 7, path: '/', sameSite: 'lax' })

      const meResponse = await tenantApi.getMeWithToken(authToken)
      if (meResponse.error) {
        const errorMessage = (meResponse.error as any)?.value?.error || 'Failed to fetch user data'
        setError(errorMessage)
        toast.error(errorMessage)
        return
      }

      let userName = loginData.tenant?.businessName || 'User'
      // Use tab-based role — do NOT override from meData.role, which contains the
      // team member's permission level ('admin', 'member', 'viewer') rather than the
      // session role the middleware and useSession hooks expect.
      const userRole: string = activeTab === 'business-admin' ? 'BUSINESS_ADMIN' : 'BUSINESS_TEAM_MEMBER'
      let memberRole: string | undefined

      if (meResponse.data?.data) {
        const meData = meResponse.data.data as any
        if ('businessName' in meData) {
          userName = meData.businessName
        } else if ('firstName' in meData && 'lastName' in meData) {
          userName = `${meData.firstName} ${meData.lastName}`
        }
        // Team member login responses use tenantId directly instead of tenant.id
        if (!tenantId && 'tenantId' in meData) {
          tenantId = meData.tenantId
        }
        // Capture the tenant-level permission role for team members
        if (activeTab === 'team-member' && 'role' in meData) {
          memberRole = meData.role
        }
      }

      const result = await signIn('credentials', {
        email: data.email,
        name: userName,
        role: userRole,
        tenantId: tenantId,
        memberRole: memberRole,
        redirect: false,
      })

      if (!result?.ok) {
        const errorMsg = result?.error || 'Failed to complete sign in'
        setError(errorMsg)
        toast.error(errorMsg)
        return
      }

      toast.success('Login successful!')
      router.push('/dashboard')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in. Please try again.'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  return (
    <div className="w-full p-4">
      <Card className="w-full max-w-md mx-auto shadow-card">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showSuccess && (
            <Alert className="mb-4 border-success bg-success/10">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                Password reset successful! You can now sign in with your new password.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
            <TabsList className="w-full">
              <TabsTrigger value="business-admin" className="flex-1">Business Admin</TabsTrigger>
              <TabsTrigger value="team-member" className="flex-1">Team Member</TabsTrigger>
            </TabsList>
          </Tabs>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="name@example.com"
                          className="pl-10"
                          autoComplete="off"
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
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline font-medium">
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          className="pl-10 pr-10"
                          autoComplete="off"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
        </CardFooter>
      </Card>
    </div>
  )
}
