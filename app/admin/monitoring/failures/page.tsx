'use client'

import { Suspense } from 'react'
import MonitoringFailures from '@/views/admin/monitoring/MonitoringFailures'

export default function MonitoringFailuresPage() {
  return (
    <Suspense>
      <MonitoringFailures />
    </Suspense>
  )
}
