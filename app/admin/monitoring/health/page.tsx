'use client'

import { Suspense } from 'react'
import MonitoringHealth from '@/views/admin/monitoring/MonitoringHealth'

export default function MonitoringHealthPage() {
  return (
    <Suspense>
      <MonitoringHealth />
    </Suspense>
  )
}
