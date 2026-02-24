'use client'

import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, AlertTriangle, Lock, Key, UserCheck } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export default function Security() {
  const securityScore = 92;
  
  const securityChecks = [
    { name: 'Two-Factor Authentication', status: 'enabled', icon: Lock },
    { name: 'API Key Encryption', status: 'enabled', icon: Key },
    { name: 'Session Management', status: 'enabled', icon: UserCheck },
    { name: 'Audit Logging', status: 'enabled', icon: Shield },
    { name: 'Rate Limiting', status: 'enabled', icon: CheckCircle },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Security</h1>
            <p className="page-subtitle">Platform security settings and compliance</p>
          </div>
        </div>

        {/* Security Score */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl gradient-success flex items-center justify-center">
                  <Shield className="w-8 h-8 text-success-foreground" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Security Score: {securityScore}/100</h2>
                  <p className="text-muted-foreground">
                    Your platform has excellent security measures in place
                  </p>
                </div>
              </div>
              <Badge className="bg-success/10 text-success text-lg px-4 py-2">Excellent</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Security Checks */}
        <Card>
          <CardHeader>
            <CardTitle>Security Features</CardTitle>
            <CardDescription>Current status of security features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {securityChecks.map((check) => (
                <div key={check.name} className="flex items-center justify-between p-4 rounded-lg shadow-card bg-card">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <check.icon className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium">{check.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {check.status === 'enabled' ? 'Active and protecting your platform' : 'Not configured'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <span className="text-sm text-success capitalize">{check.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Security Policies */}
        <Card>
          <CardHeader>
            <CardTitle>Security Policies</CardTitle>
            <CardDescription>Configure platform-wide security policies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enforce Strong Passwords</p>
                <p className="text-sm text-muted-foreground">
                  Require minimum 8 characters with uppercase, number, and special character
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Account Lockout</p>
                <p className="text-sm text-muted-foreground">
                  Lock accounts after 5 failed login attempts
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">IP Whitelisting</p>
                <p className="text-sm text-muted-foreground">
                  Restrict access to specific IP addresses
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Audit All Actions</p>
                <p className="text-sm text-muted-foreground">
                  Log all user actions for compliance
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
