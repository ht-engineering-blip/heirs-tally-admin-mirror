'use client'

import { Suspense } from 'react'
import MonitoringOverview from '@/views/admin/monitoring/MonitoringOverview'

export default function MonitoringOverviewPage() {
  return (
    <Suspense>
      <MonitoringOverview />
    </Suspense>
  )
}
