import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { getDashboardRoute } from '@/lib/auth/routes'

export default async function Home() {
  const session = await auth()
  const userRole = session?.user?.role as 'SUPER_ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_TEAM_MEMBER' | undefined
  
  if (session && userRole) {
    const dashboardRoute = getDashboardRoute(userRole)
    redirect(dashboardRoute)
  } else {
    redirect('/auth/login')
  }
}
