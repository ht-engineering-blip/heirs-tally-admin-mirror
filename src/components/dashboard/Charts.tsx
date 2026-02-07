import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartContainer({ title, children, className }: ChartContainerProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
}

interface TransactionVolumeChartProps {
  data: Array<{ month: string; invoices: number; value: number }>;
}

export function TransactionVolumeChart({ data }: TransactionVolumeChartProps) {
  return (
    <ChartContainer title="Transaction Volume (2024)">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}> 
          <XAxis 
            dataKey="month" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            cursor={{ fill: "transparent" }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value: number) => [value.toLocaleString(), 'Invoices']}
          /> 
          <Bar 
            dataKey="invoices" 
            fill="hsl(var(--primary))" 
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          />
            <ReferenceLine
              y={data.reduce((max, current) => current.invoices > max.invoices ? current : max, { invoices: 0 }).invoices}
              stroke="hsl(var(--primary))"
              strokeDasharray="6 6"
              label={{
                value: data.reduce((max, current) => current.invoices > max.invoices ? current : max, { invoices: 0 }).invoices.toLocaleString(),
                position: "insideRight",
                fill: "hsl(var(--primary))",
                fontSize: 12,
                dx: 10,
              }}
            />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

interface WeeklyTrendChartProps {
  data: Array<{ day: string; invoices: number; success: number; failed: number }>;
}

export function WeeklyTrendChart({ data }: WeeklyTrendChartProps) {
  return (
    <ChartContainer title="Weekly Trend">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis 
            dataKey="day" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Area 
            type="monotone" 
            dataKey="success" 
            stroke="hsl(var(--success))" 
            fillOpacity={1} 
            fill="url(#colorSuccess)" 
            strokeWidth={2}
          />
          <Area 
            type="monotone" 
            dataKey="failed" 
            stroke="hsl(var(--destructive))" 
            fillOpacity={1} 
            fill="url(#colorFailed)" 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

interface ErpDistributionChartProps {
  data: Array<{ name: string; value: number; color: string }>;
}

export function ErpDistributionChart({ data }: ErpDistributionChartProps) {
  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  return (
    <ChartContainer title="ERP Distribution">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [`${value}%`, 'Share']}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

interface TenantStatusChartProps {
  data: Array<{ status: string; count: number; color: string }>;
}

export function TenantStatusChart({ data }: TenantStatusChartProps) {
  return (
    <ChartContainer title="Tenant Status">
      <div className="space-y-4 py-4">
        {data.map((item) => (
          <div key={item.status} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.status}</span>
              <span className="font-medium">{item.count}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.count / 248) * 100}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </ChartContainer>
  );
}
