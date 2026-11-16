'use client'

import { Suspense } from 'react'
import MonitoringCompany from '@/views/admin/monitoring/MonitoringCompany'

export default function MonitoringCompanyPage() {
  return (
    <Suspense>
      <MonitoringCompany />
    </Suspense>
  )
}
