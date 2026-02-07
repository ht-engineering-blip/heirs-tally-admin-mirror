'use client'

import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Download, Upload, Plus, FileJson, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DictionaryItem {
  code: string;
  name: string;
  category: string;
  status: 'active' | 'deprecated';
}

const taxTypes: DictionaryItem[] = [
  { code: 'VAT', name: 'Value Added Tax', category: 'Tax', status: 'active' },
  { code: 'WHT', name: 'Withholding Tax', category: 'Tax', status: 'active' },
  { code: 'CIT', name: 'Company Income Tax', category: 'Tax', status: 'active' },
  { code: 'NHIS', name: 'National Health Insurance', category: 'Levy', status: 'active' },
  { code: 'EDT', name: 'Education Tax', category: 'Tax', status: 'active' },
  { code: 'STAMP', name: 'Stamp Duty', category: 'Duty', status: 'active' },
];

const currencies: DictionaryItem[] = [
  { code: 'NGN', name: 'Nigerian Naira', category: 'Currency', status: 'active' },
  { code: 'USD', name: 'US Dollar', category: 'Currency', status: 'active' },
  { code: 'EUR', name: 'Euro', category: 'Currency', status: 'active' },
  { code: 'GBP', name: 'British Pound', category: 'Currency', status: 'active' },
];

const units: DictionaryItem[] = [
  { code: 'EA', name: 'Each', category: 'Unit', status: 'active' },
  { code: 'KG', name: 'Kilogram', category: 'Unit', status: 'active' },
  { code: 'LTR', name: 'Litre', category: 'Unit', status: 'active' },
  { code: 'MTR', name: 'Metre', category: 'Unit', status: 'active' },
  { code: 'BOX', name: 'Box', category: 'Unit', status: 'active' },
  { code: 'PKG', name: 'Package', category: 'Unit', status: 'active' },
  { code: 'SVC', name: 'Service', category: 'Unit', status: 'active' },
  { code: 'HR', name: 'Hour', category: 'Unit', status: 'active' },
];

function DictionaryTable({ items }: { items: DictionaryItem[] }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">Code</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.code} className="border-t hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <code className="px-2 py-1 bg-muted rounded text-sm">{item.code}</code>
              </td>
              <td className="px-4 py-3 text-sm">{item.name}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{item.category}</td>
              <td className="px-4 py-3">
                <Badge className={item.status === 'active' ? 'status-active' : 'status-inactive'}>
                  {item.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FirsDictionary() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">FIRS Dictionary</h1>
            <p className="page-subtitle">Manage FIRS reference data and validation schemas</p>
          </div>
          <div className="flex gap-2">
            <Button className="rounded-full" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button className="rounded-full" variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button className="rounded-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync from FIRS
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileJson className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">FIRS Schema v2.1</h3>
                  <p className="text-sm text-muted-foreground">
                    Last updated: February 1, 2025
                  </p>
                </div>
              </div>
              <Badge className="bg-success/10 text-success">Up to date</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Dictionary Tabs */}
        <Tabs defaultValue="tax-types" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tax-types">Tax Types</TabsTrigger>
            <TabsTrigger value="currencies">Currencies</TabsTrigger>
            <TabsTrigger value="units">Units of Measure</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search dictionary entries..." className="pl-10" />
            </div>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </Button>
          </div>

          <TabsContent value="tax-types">
            <Card>
              <CardHeader>
                <CardTitle>Tax Types</CardTitle>
                <CardDescription>
                  FIRS-approved tax categories for invoice classification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DictionaryTable items={taxTypes} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="currencies">
            <Card>
              <CardHeader>
                <CardTitle>Currencies</CardTitle>
                <CardDescription>
                  Supported currencies for invoice amounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DictionaryTable items={currencies} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="units">
            <Card>
              <CardHeader>
                <CardTitle>Units of Measure</CardTitle>
                <CardDescription>
                  Standard units for invoice line items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DictionaryTable items={units} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
