import { DashboardLayout } from '@/components/layout'



export default function DashboardLayoutBase({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <DashboardLayout>
            {children}
        </DashboardLayout>
    )
}
