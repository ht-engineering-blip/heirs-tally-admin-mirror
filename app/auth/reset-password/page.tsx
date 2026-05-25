'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import { FileText, Lock, ArrowRight, ArrowLeft, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

const resetPasswordSchema = z.object({
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

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPageWrapper() {
  return (
    <Suspense>
      <ResetPasswordPage />
    </Suspense>
  )
}

function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)

  useEffect(() => {
    if (!token) {
      setTokenValid(false)
      return
    }
    const validate = async () => {
      try {
        const { createTenantApi } = await import('@/lib/api/tenant-api')
        const tenantApi = createTenantApi()
        const response = await tenantApi.validateResetToken(token)
        if (response.error) {
          setTokenValid(false)
          setError('This reset link has expired or is invalid. Please request a new one.')
        } else {
          setTokenValid(true)
        }
      } catch {
        setTokenValid(false)
        setError('This reset link has expired or is invalid. Please request a new one.')
      }
    }
    validate()
  }, [token])

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      setError('Invalid or missing reset token')
      return
    }

    try {
      setError(null)
      const { createTenantApi } = await import('@/lib/api/tenant-api')
      const tenantApi = createTenantApi()
      const response = await tenantApi.resetPassword(token, data.password)

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || 'Failed to reset password'
        setError(errorMessage)
        toast.error(errorMessage)
        return
      }

      toast.success('Password reset successful!')
      router.push('/auth/login?reset=success')
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to reset password. Please try again.'
      setError(errorMessage)
      toast.error(errorMessage)
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

  if (tokenValid === null) {
    return (
      <div className="w-full p-4">
        <Card className="w-full max-w-md mx-auto shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Validating reset link...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (tokenValid === false) {
    return (
      <div className="w-full p-4">
        <Card className="w-full max-w-md mx-auto shadow-card">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Link expired</CardTitle>
            <CardDescription>This reset link is invalid or has expired</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || 'Invalid or missing reset token. Please request a new password reset link.'}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Link href="/auth/forgot-password" className="w-full">
              <Button className="w-full">
                Request new reset link
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
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
          <CardTitle className="text-2xl font-bold">Reset password</CardTitle>
          <CardDescription>
            Enter your new password below
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
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter new password"
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
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm new password"
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
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? 'Resetting password...' : 'Reset password'}
                {!form.formState.isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
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
