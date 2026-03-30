import { Activity, Wifi, AlertTriangle, Clock, Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SystemHealth } from '@/lib/mockData';

interface SystemHealthCardProps {
  health: SystemHealth;
}

export function SystemHealthCard({ health }: SystemHealthCardProps) {
  const getConnectivityColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-success text-success-foreground';
      case 'degraded':
        return 'bg-warning text-warning-foreground';
      case 'down':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const metrics = [
    {
      label: 'API Uptime',
      value: `${health.apiUptime}%`,
      icon: Activity,
      status: health.apiUptime >= 99.9 ? 'good' : health.apiUptime >= 99 ? 'warning' : 'critical',
    },
    {
      label: 'NRS Connectivity',
      value: health.firsConnectivity,
      icon: Wifi,
      status: health.firsConnectivity,
    },
    {
      label: 'Queue Depth',
      value: health.queueDepth.toString(),
      icon: Gauge,
      status: health.queueDepth < 500 ? 'good' : health.queueDepth < 1000 ? 'warning' : 'critical',
    },
    {
      label: 'Avg Response Time',
      value: `${health.avgResponseTime}ms`,
      icon: Clock,
      status: health.avgResponseTime < 300 ? 'good' : health.avgResponseTime < 500 ? 'warning' : 'critical',
    },
    {
      label: 'Error Rate',
      value: `${health.errorRate}%`,
      icon: AlertTriangle,
      status: health.errorRate < 0.5 ? 'good' : health.errorRate < 1 ? 'warning' : 'critical',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
      case 'healthy':
        return 'text-success';
      case 'warning':
      case 'degraded':
        return 'text-warning';
      case 'critical':
      case 'down':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">System Health</CardTitle>
          <Badge className={getConnectivityColor(health.firsConnectivity)}>
            {health.firsConnectivity === 'healthy' ? 'All Systems Operational' : 'Issues Detected'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="text-center p-3 rounded-lg bg-muted/50">
              <metric.icon className={cn('w-5 h-5 mx-auto mb-2', getStatusColor(metric.status))} />
              <p className="text-lg font-semibold">{metric.value}</p>
              <p className="text-xs text-muted-foreground">{metric.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
