'use client'

import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Wifi, AlertTriangle, Clock, Gauge, RefreshCw, Server, Database, Cloud } from 'lucide-react';
import { mockSystemHealth } from '@/lib/mockData';
import { cn } from '@/lib/utils';

export default function AdminSystemHealth() {
  const health = mockSystemHealth;

  const services = [
    {
      name: 'API Gateway',
      status: 'operational',
      uptime: '99.99%',
      icon: Server,
    },
    {
      name: 'FIRS Integration',
      status: health.firsConnectivity === 'healthy' ? 'operational' : health.firsConnectivity,
      uptime: '99.95%',
      icon: Cloud,
    },
    {
      name: 'Database',
      status: 'operational',
      uptime: '99.99%',
      icon: Database,
    },
    {
      name: 'Message Queue',
      status: health.queueDepth > 1000 ? 'degraded' : 'operational',
      uptime: '99.98%',
      icon: Activity,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
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

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'operational':
      case 'healthy':
        return 'bg-success';
      case 'degraded':
        return 'bg-warning';
      case 'down':
        return 'bg-destructive';
      default:
        return 'bg-muted-foreground';
    }
  };

  return ( 
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">System Health</h1>
            <p className="page-subtitle">Monitor platform services and performance</p>
          </div>
          <Button className="rounded-full" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Overall Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">All Systems Operational</h2>
                  <p className="text-muted-foreground">
                    Last checked: {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <Badge className={getStatusColor('operational')}>Operational</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-success" />
                <div>
                  <p className="text-2xl font-bold">{health.apiUptime}%</p>
                  <p className="text-sm text-muted-foreground">API Uptime</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Wifi className={cn('w-5 h-5', health.firsConnectivity === 'healthy' ? 'text-success' : 'text-warning')} />
                <div>
                  <p className="text-2xl font-bold capitalize">{health.firsConnectivity}</p>
                  <p className="text-sm text-muted-foreground">FIRS Connection</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Gauge className={cn('w-5 h-5', health.queueDepth < 500 ? 'text-success' : 'text-warning')} />
                <div>
                  <p className="text-2xl font-bold">{health.queueDepth}</p>
                  <p className="text-sm text-muted-foreground">Queue Depth</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className={cn('w-5 h-5', health.avgResponseTime < 300 ? 'text-success' : 'text-warning')} />
                <div>
                  <p className="text-2xl font-bold">{health.avgResponseTime}ms</p>
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className={cn('w-5 h-5', health.errorRate < 0.5 ? 'text-success' : 'text-warning')} />
                <div>
                  <p className="text-2xl font-bold">{health.errorRate}%</p>
                  <p className="text-sm text-muted-foreground">Error Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Services List */}
        <Card>
          <CardHeader>
            <CardTitle>Service Status</CardTitle>
            <CardDescription>Current status of all platform services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {services.map((service) => (
                <div
                  key={service.name}
                  className="flex items-center justify-between p-4 rounded-lg shadow-card bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <service.icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Uptime: {service.uptime}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', getStatusDot(service.status))} />
                    <span className="text-sm capitalize">{service.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div> 
  );
}
