import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Loader2, Wallet, TrendingUp, Download, Clock, CheckCircle, XCircle } from 'lucide-react';
import { WithdrawalForm } from './withdrawal-form';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../lib/auth';

interface WalletData {
  current_balance: number;
  total_earnings: number;
  credit_history: Array<{
    id: number;
    amount: string;
    balance_before: string;
    balance_after: string;
    reason: string;
    created_at: string;
    action_assignments: {
      action_type: string;
      platform: string;
      target_url: string;
    };
  }>;
}

export function WalletDashboard() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.role === 'provider') {
      fetchWalletData();
    } else if (user && user.role !== 'provider') {
      toast({
        title: "Access Denied",
        description: "Only providers can access the wallet",
        variant: "destructive"
      });
      setLoading(false);
    }
  }, [user]);

  const fetchWalletData = async () => {
    try {
      // Get the token from localStorage (Supabase access token)
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication required",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      console.log('Fetching wallet data with token:', token.substring(0, 20) + '...');

      const response = await fetch('/api/provider/wallet', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Wallet response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Wallet data received:', data);
        setWalletData(data);
      } else if (response.status === 403) {
        const errorText = await response.text();
        console.error('Authentication error:', errorText);
        toast({
          title: "Authentication Error",
          description: "Please log in again to access your wallet",
          variant: "destructive"
        });
      } else {
        const errorText = await response.text();
        console.error('Wallet error:', errorText);
        toast({
          title: "Error",
          description: "Failed to load wallet data",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast({
        title: "Error",
        description: "Failed to load wallet data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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

  const getStatusIcon = (reason: string) => {
    if (reason.includes('approved') || reason.includes('successful')) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading wallet data...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Please log in to access your wallet</p>
        </CardContent>
      </Card>
    );
  }

  if (user.role !== 'provider') {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Only providers can access the wallet</p>
        </CardContent>
      </Card>
    );
  }

  if (!walletData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Failed to load wallet data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {walletData.current_balance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Available for withdrawal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {walletData.total_earnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              All time earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Dialog open={showWithdrawal} onOpenChange={setShowWithdrawal}>
              <DialogTrigger asChild>
                <Button className="w-full" disabled={walletData.current_balance <= 0}>
                  Withdraw Funds
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Withdraw Funds</DialogTitle>
                </DialogHeader>
                <WithdrawalForm
                  currentBalance={walletData.current_balance}
                  onSuccess={() => {
                    setShowWithdrawal(false);
                    fetchWalletData();
                    toast({
                      title: "Success",
                      description: "Withdrawal request submitted successfully",
                    });
                  }}
                  onCancel={() => setShowWithdrawal(false)}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Recent credit transactions and earnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="recent" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recent">Recent Transactions</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="recent" className="space-y-4">
              {walletData.credit_history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions yet</p>
                  <p className="text-sm">Complete your first service to see earnings here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {walletData.credit_history.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(transaction.reason)}
                        <div>
                          <p className="font-medium">
                            {transaction.action_assignments?.action_type || 'Service Credit'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.action_assignments?.platform || 'Platform'} • {transaction.reason}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(transaction.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          +KES {parseFloat(transaction.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Balance: KES {parseFloat(transaction.balance_after).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Earnings by Platform</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const platformStats = walletData.credit_history.reduce((acc, transaction) => {
                        const platform = transaction.action_assignments?.platform || 'Unknown';
                        acc[platform] = (acc[platform] || 0) + parseFloat(transaction.amount);
                        return acc;
                      }, {} as Record<string, number>);

                      return Object.entries(platformStats).map(([platform, amount]) => (
                        <div key={platform} className="flex justify-between items-center py-2">
                          <span className="capitalize">{platform}</span>
                          <Badge variant="secondary">KES {amount.toFixed(2)}</Badge>
                        </div>
                      ));
                    })()}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Earnings by Service</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const serviceStats = walletData.credit_history.reduce((acc, transaction) => {
                        const service = transaction.action_assignments?.action_type || 'Unknown';
                        acc[service] = (acc[service] || 0) + parseFloat(transaction.amount);
                        return acc;
                      }, {} as Record<string, number>);

                      return Object.entries(serviceStats).map(([service, amount]) => (
                        <div key={service} className="flex justify-between items-center py-2">
                          <span className="capitalize">{service.replace('_', ' ')}</span>
                          <Badge variant="outline">KES {amount.toFixed(2)}</Badge>
                        </div>
                      ));
                    })()}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 