import { useCustom } from "@refinedev/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";
import { adminApiPath } from "@/config";
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
  const x = cx + radius * Math.cos(-(midAngle ?? 0) * RADIAN);
  const y = cy + radius * Math.sin(-(midAngle ?? 0) * RADIAN);
  const percentage = ((percent ?? 0) * 100).toFixed(0);

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

const formatCount = (value: number | undefined): string =>
  value === undefined || value === null ? "—" : Number(value).toLocaleString();

const StatCard = ({ title, value, detail }: { title: string; value: number | undefined; detail: string }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{formatCount(value)}</div>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </CardContent>
  </Card>
);

export const Dashboard = () => {
  const {
    result: statsResult,
    query: { isLoading: statsLoading, isError: statsIsError, error: statsError, refetch: refetchStats },
  } = useCustom<DashboardStats>({
    url: adminApiPath("dashboard/stats"),
    method: "get",
  });

  const {
    result: chartsResult,
    query: { isLoading: chartsLoading, isError: chartsIsError, error: chartsError, refetch: refetchCharts },
  } = useCustom<ChartData>({
    url: adminApiPath("dashboard/charts"),
    method: "get",
  });

  const stats = statsResult?.data;
  const charts = chartsResult?.data;

  const isLoading = statsLoading || chartsLoading;
  const loadError = statsIsError ? statsError : chartsIsError ? chartsError : null;

  const hasTransactionData = charts?.transactionTrends?.some(d => d.total > 0);
  const hasStatusData = charts?.statusDistribution?.some(d => d.value > 0);
  const hasUserData = charts?.userGrowth?.some(d => d.totalUsers > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <Card key={key}>
              <CardContent className="pt-6">
                <LoadingCard lines={2} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : loadError ? (
        <Card>
          <CardHeader>
            <CardTitle>Unable to load dashboard data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{loadError.message}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (statsIsError) void refetchStats();
                if (chartsIsError) void refetchCharts();
              }}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Total Users"
              value={stats?.totalUsers}
              detail={`${formatCount(stats?.verifiedUsers)} verified`}
            />
            <StatCard
              title="Total Wallets"
              value={stats?.totalWallets}
              detail={`${formatCount(stats?.activeWallets)} active`}
            />
            <StatCard
              title="Transactions"
              value={stats?.totalTransactions}
              detail={`${formatCount(stats?.completedTransactions)} completed`}
            />
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Transaction Trends */}
            <Card className="md:col-span-2">
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
                        formatter={(value) => [`${Number(value).toFixed(4)} SOL`, 'Volume']}
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
            <Card className="md:col-span-2">
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
