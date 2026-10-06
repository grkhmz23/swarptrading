import { useCustom } from "@refinedev/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardStats } from "@/types";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  transactionTrends: Array<{
    date: string;
    total: number;
    completed: number;
    failed: number;
    pending: number;
    volume: number;
  }>;
  statusDistribution: Array<{
    name?: string;
    value: number;
  }>;
  userGrowth: Array<{
    date: string;
    newUsers: number;
    totalUsers: number;
  }>;
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b'];

const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, name, percent }: { cx: number; cy: number; midAngle?: number; outerRadius: number; name?: string; percent?: number }) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 25;
  const x = cx + radius * Math.cos(-(midAngle || 0) * RADIAN);
  const y = cy + radius * Math.sin(-(midAngle || 0) * RADIAN);
  const percentage = ((percent || 0) * 100).toFixed(0);

  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      style={{ fontSize: '12px', fontWeight: 500 }}
    >
      <tspan x={x} dy="0">{name}</tspan>
      <tspan x={x} dy="1.2em">{percentage}%</tspan>
    </text>
  );
};

export const Dashboard = () => {
  const { result: statsResult, query: { isLoading: statsLoading } } = useCustom<DashboardStats>({
    url: "/admin-api/dashboard/stats",
    method: "get",
  });

  const { result: chartsResult, query: { isLoading: chartsLoading } } = useCustom<ChartData>({
    url: "/admin-api/dashboard/charts",
    method: "get",
  });

  const stats = statsResult.data;
  const charts = chartsResult.data;

  const isLoading = statsLoading || chartsLoading;

  // Debug: Log the chart data

  // Check if we have any data
  const hasTransactionData = charts?.transactionTrends?.some(d => d.total > 0);
  const hasStatusData = charts?.statusDistribution?.some(d => d.value > 0);
  const hasUserData = charts?.userGrowth?.some(d => d.totalUsers > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.verifiedUsers || 0} verified
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Wallets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalWallets || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.activeWallets || 0} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalTransactions || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.completedTransactions || 0} completed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Transaction Trends */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Transaction Trends (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={charts?.transactionTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString();
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      name="Completed"
                    />
                    <Area
                      type="monotone"
                      dataKey="pending"
                      stackId="1"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      name="Pending"
                    />
                    <Area
                      type="monotone"
                      dataKey="failed"
                      stackId="1"
                      stroke="#ef4444"
                      fill="#ef4444"
                      name="Failed"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Transaction Volume */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Transaction Volume</CardTitle>
              </CardHeader>
              <CardContent>
                {!hasTransactionData ? (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No transaction data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={charts?.transactionTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                      />
                      <YAxis allowDecimals={true} />
                      <Tooltip
                        labelFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString();
                        }}
                        formatter={(value: number) => [`${value.toFixed(4)} SOL`, 'Volume']}
                      />
                      <Legend />
                      <Bar dataKey="volume" fill="#40e0d0" name="Volume (SOL)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {!hasStatusData ? (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No status data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                      <Pie
                        data={charts?.statusDistribution?.filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomLabel}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {charts?.statusDistribution?.filter(d => d.value > 0).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* User Growth */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>User Growth (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                {!hasUserData ? (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No user data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={charts?.userGrowth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                      />
                      <YAxis allowDecimals={false} />
                      <Tooltip
                        labelFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString();
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="totalUsers"
                        stroke="#40e0d0"
                        strokeWidth={2}
                        name="Total Users"
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="newUsers"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        name="New Users"
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
