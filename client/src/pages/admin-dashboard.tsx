import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  ShoppingCart, 
  Activity, 
  BarChart3,
  Calendar,
  Filter
} from 'lucide-react';

interface PlatformStats {
  total_revenue: number;
  total_transactions: number;
  total_users: number;
  total_providers: number;
  total_buyers: number;
  pending_verifications: number;
  completed_services: number;
  revenue_today: number;
  revenue_this_week: number;
  revenue_this_month: number;
}

interface RevenueData {
  id: number;
  transaction_id: number;
  amount: string;
  revenue_type: string;
  description?: string;
  created_at: string;
  transactions: {
    buyer_id: number;
    total_cost: string;
    status: string;
    users: {
      name: string;
      email: string;
    };
  };
}

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  balance: string;
  created_at: string;
  total_earnings?: number;
  total_services?: number;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [timeFilter, setTimeFilter] = useState('all');
  const [revenueFilter, setRevenueFilter] = useState('all');

  // Redirect if not admin
  if (user?.role !== 'admin') {
    setLocation('/');
    return null;
  }

  // Fetch platform statistics
  const { data: stats, isLoading: statsLoading } = useQuery<PlatformStats>({
    queryKey: ['/api/admin/stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch revenue data
  const { data: revenueData = [], isLoading: revenueLoading } = useQuery<RevenueData[]>({
    queryKey: ['/api/admin/revenue', timeFilter, revenueFilter],
  });

  // Fetch user data
  const { data: userData = [], isLoading: userLoading } = useQuery<UserData[]>({
    queryKey: ['/api/admin/users'],
  });

  // Fetch transaction data
  const { data: transactionData = [], isLoading: transactionLoading } = useQuery({
    queryKey: ['/api/admin/transactions'],
  });

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      processing: 'bg-blue-100 text-blue-800'
    };
    return variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      admin: 'bg-purple-100 text-purple-800',
      provider: 'bg-blue-100 text-blue-800',
      buyer: 'bg-green-100 text-green-800'
    };
    return variants[role as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Platform overview and analytics</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
              </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats?.total_revenue || 0)}</div>
              <p className="text-xs text-muted-foreground">
                All time platform earnings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.total_providers || 0} providers, {stats?.total_buyers || 0} buyers
              </p>
            </CardContent>
          </Card>

                <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Services</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.completed_services || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.total_transactions || 0} total transactions
              </p>
                  </CardContent>
                </Card>

                <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pending_verifications || 0}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting verification
              </p>
            </CardContent>
          </Card>
                      </div>

        {/* Revenue Trends */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Today's Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(stats?.revenue_today || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
            <CardHeader>
              <CardTitle className="text-lg">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {formatCurrency(stats?.revenue_this_week || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
            <CardHeader>
              <CardTitle className="text-lg">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {formatCurrency(stats?.revenue_this_month || 0)}
                    </div>
                  </CardContent>
                </Card>
              </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="revenue" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Platform Revenue</CardTitle>
                    <CardDescription>Detailed revenue breakdown</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Select value={timeFilter} onValueChange={setTimeFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={revenueFilter} onValueChange={setRevenueFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="service_fee">Service Fees</SelectItem>
                        <SelectItem value="withdrawal_fee">Withdrawal Fees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenueData.map((revenue) => (
                      <TableRow key={revenue.id}>
                        <TableCell>{formatDate(revenue.created_at)}</TableCell>
                        <TableCell>#{revenue.transaction_id}</TableCell>
                        <TableCell>{revenue.transactions?.users?.name || 'Unknown'}</TableCell>
                        <TableCell className="font-bold text-green-600">
                          {formatCurrency(parseFloat(revenue.amount))}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(revenue.revenue_type)}>
                            {revenue.revenue_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{revenue.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Platform users and their statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Earnings</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userData.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadge(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(parseFloat(user.balance || '0'))}</TableCell>
                        <TableCell>{formatCurrency(user.total_earnings || 0)}</TableCell>
                        <TableCell>{user.total_services || 0}</TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>All platform transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionData.map((transaction: any) => (
                      <TableRow key={transaction.id}>
                        <TableCell>#{transaction.id}</TableCell>
                        <TableCell>{transaction.users?.name || 'Unknown'}</TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(parseFloat(transaction.total_cost))}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(transaction.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Breakdown</CardTitle>
                  <CardDescription>Platform revenue by type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Service Fees (3 KES per transaction)</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency((stats?.total_transactions || 0) * 3)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Withdrawal Fees (50 KES per withdrawal)</span>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(0)} {/* TODO: Calculate from withdrawal data */}
                      </span>
                    </div>
                    <hr />
                    <div className="flex justify-between items-center font-bold text-lg">
                      <span>Total Revenue</span>
                      <span className="text-green-600">
                        {formatCurrency(stats?.total_revenue || 0)}
                      </span>
              </div>
                </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Distribution</CardTitle>
                  <CardDescription>Platform user breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Providers</span>
                      <Badge variant="secondary">{stats?.total_providers || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Buyers</span>
                      <Badge variant="secondary">{stats?.total_buyers || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Admins</span>
                      <Badge variant="secondary">1</Badge>
                    </div>
                    <hr />
                    <div className="flex justify-between items-center font-bold">
                      <span>Total Users</span>
                      <span>{stats?.total_users || 0}</span>
              </div>
                </div>
                </CardContent>
              </Card>
        </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
