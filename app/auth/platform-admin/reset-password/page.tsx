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
import { Logo } from '@/components/shared/Logo'
import { toast } from '@/components/ui/sonner'
import { createPlatformAdminApi } from '@/lib/api/platform-admin-api'
import { cn } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff, Lock } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

// Min 12 chars per §1.2 of the contract doc — stricter than the tenant
// reset flow's 8-char rule, since a platform admin token carries far more
// access. The backend doesn't expose a separate validate-token endpoint for
// this flow (unlike tenant reset), so there's nothing to pre-check the token
// against before the user submits — an invalid/expired token only surfaces
// as the reset call's own 400.
const resetPasswordSchema = z.object({
  password: z.string().min(12, 'Password must be at least 12 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export default function PlatformAdminResetPasswordPageWrapper() {
  return (
    <Suspense>
      <PlatformAdminResetPasswordPage />
    </Suspense>
  )
}

function PlatformAdminResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      setError('Invalid or missing reset token')
      return
    }

    try {
      setError(null)
      const api = createPlatformAdminApi()
      await api.resetPassword(token, data.password)
      toast.success('Password reset successful!')
      router.push('/auth/platform-admin/login?reset=success')
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
    if (pwd.length >= 12) strength++
    if (pwd.length >= 16) strength++
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
      <div className="w-full p-4">
        <Card className="w-full max-w-md mx-auto shadow-card">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <Logo
                asLink={false}
                alt="Heirs E-Invoicing Admin"
                width={48}
                height={48}
                imageClassName="w-12 h-12 rounded-full"
                showText
                title="Heirs E-Invoicing Admin"
              />
            </div>
            <CardTitle className="text-2xl font-bold">Link invalid</CardTitle>
            <CardDescription>This reset link is missing its token</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Invalid or missing reset token. Please request a new password reset link.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Link href="/auth/platform-admin/forgot-password" className="w-full">
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
            <Logo
              asLink={false}
              alt="Heirs E-Invoicing Admin"
              width={48}
              height={48}
              imageClassName="w-12 h-12 rounded-full"
              showText
              title="Heirs E-Invoicing Admin"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Reset password</CardTitle>
          <CardDescription>Enter your new platform admin password below</CardDescription>
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
                          {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div
                              key={i}
                              className={cn(
                                'flex-1 rounded-full transition-colors',
                                i <= passwordStrength.strength ? passwordStrength.bgColor : 'bg-muted'
                              )}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Password strength: <span className={cn('font-medium', passwordStrength.textColor)}>{passwordStrength.label}</span>
                        </p>
                      </div>
                    )}
                    <FormDescription>Must be at least 12 characters</FormDescription>
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

              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Resetting password...' : 'Reset password'}
                {!form.formState.isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Link href="/auth/platform-admin/login" className="w-full">
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
