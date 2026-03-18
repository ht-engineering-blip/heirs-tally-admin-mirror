'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface LogoutDialogProps {
  callbackUrl?: string
  children: React.ReactNode
}

export function LogoutDialog({ callbackUrl = '/auth/login', children }: LogoutDialogProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await signOut({ callbackUrl })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
          <AlertDialogDescription>
            You will be signed out of your account and redirected to the login page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoggingOut}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? 'Logging out...' : 'Log out'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
