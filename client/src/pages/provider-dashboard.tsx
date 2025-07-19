import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth.tsx";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { calculateWithdrawalFee } from "@/lib/paystack";

export default function ProviderDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");

  // Redirect if not provider
  if (user?.role !== 'provider') {
    setLocation('/');
    return null;
  }

  const { data: services = [] } = useQuery({
    queryKey: ['/api/services/provider'],
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['/api/transactions'],
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ['/api/withdrawals'],
  });

  const createServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/services', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services/provider'] });
      setServiceModalOpen(false);
      toast({ title: "Success", description: "Service created successfully" });
    },
  });

  const requestWithdrawalMutation = useMutation({
    mutationFn: async (amount: string) => {
      const res = await apiRequest('POST', '/api/withdrawals', { amount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/withdrawals'] });
      setWithdrawalAmount("");
      toast({ title: "Success", description: "Withdrawal request submitted" });
    },
  });

  const handleCreateService = (formData: FormData) => {
    const data = {
      type: formData.get('type'),
      platform: formData.get('platform'),
      description: formData.get('description'),
    };
    createServiceMutation.mutate(data);
  };

  const handleWithdrawal = () => {
    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    const { fee, netAmount } = calculateWithdrawalFee(amount);
    if (netAmount <= 0) {
      toast({ title: "Amount too small", description: "Amount is too small after fees", variant: "destructive" });
      return;
    }

    requestWithdrawalMutation.mutate(withdrawalAmount);
  };

  const totalEarnings = transactions
    .filter((t: any) => t.status === 'completed')
    .reduce((sum: number, t: any) => sum + parseFloat(t.providerEarnings || '0'), 0);

  const pendingEarnings = transactions
    .filter((t: any) => t.status === 'pending')
    .reduce((sum: number, t: any) => sum + parseFloat(t.providerEarnings || '0'), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-6">
            <h2 className="text-xl font-bold text-primary">Provider Dashboard</h2>
            <p className="text-sm text-gray-600 mt-1">Welcome, {user?.name}</p>
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-700">
                {user?.balance?.toFixed(2) || '0.00'} KES
              </div>
              <div className="text-sm text-green-600">Available Balance</div>
            </div>
          </div>
          
          <nav className="mt-6">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center px-6 py-3 text-left ${
                activeTab === "overview" 
                  ? "text-gray-700 bg-gray-100 border-r-2 border-primary" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <i className="fas fa-chart-line mr-3"></i>
              Overview
            </button>
            
            <button
              onClick={() => setActiveTab("services")}
              className={`w-full flex items-center px-6 py-3 text-left ${
                activeTab === "services" 
                  ? "text-gray-700 bg-gray-100 border-r-2 border-primary" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <i className="fas fa-cog mr-3"></i>
              My Services
            </button>
            
            <button
              onClick={() => setActiveTab("orders")}
              className={`w-full flex items-center px-6 py-3 text-left ${
                activeTab === "orders" 
                  ? "text-gray-700 bg-gray-100 border-r-2 border-primary" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <i className="fas fa-clipboard-list mr-3"></i>
              Orders
            </button>
            
            <button
              onClick={() => setActiveTab("earnings")}
              className={`w-full flex items-center px-6 py-3 text-left ${
                activeTab === "earnings" 
                  ? "text-gray-700 bg-gray-100 border-r-2 border-primary" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <i className="fas fa-money-bill-wave mr-3"></i>
              Earnings & Withdrawals
            </button>
            
            <button
              onClick={() => setLocation('/')}
              className="w-full flex items-center px-6 py-3 text-gray-600 hover:bg-gray-100 text-left"
            >
              <i className="fas fa-home mr-3"></i>
              Home
            </button>
            
            <button
              onClick={logout}
              className="w-full flex items-center px-6 py-3 text-gray-600 hover:bg-gray-100 text-left"
            >
              <i className="fas fa-sign-out-alt mr-3"></i>
              Logout
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {activeTab === "overview" && (
            <div>
              <h1 className="text-3xl font-bold mb-8">Provider Overview</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-green-100">
                        <i className="fas fa-dollar-sign text-green-600"></i>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                        <p className="text-2xl font-bold">{totalEarnings.toFixed(2)} KES</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-yellow-100">
                        <i className="fas fa-clock text-yellow-600"></i>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Pending</p>
                        <p className="text-2xl font-bold">{pendingEarnings.toFixed(2)} KES</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-blue-100">
                        <i className="fas fa-list text-blue-600"></i>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Active Services</p>
                        <p className="text-2xl font-bold">{services.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-purple-100">
                        <i className="fas fa-shopping-cart text-purple-600"></i>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Orders</p>
                        <p className="text-2xl font-bold">{transactions.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
                    <div className="space-y-3">
                      {transactions.slice(0, 5).map((transaction: any) => (
                        <div key={transaction.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">Order #{transaction.id}</p>
                            <p className="text-sm text-gray-600">{transaction.quantity} actions</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-green-600">{parseFloat(transaction.providerEarnings || '0').toFixed(2)} KES</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              transaction.status === 'completed' ? 'bg-green-100 text-green-600' :
                              transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                              'bg-red-100 text-red-600'
                            }`}>
                              {transaction.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Quick Withdrawal</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="withdrawal-amount">Withdrawal Amount (KES)</Label>
                        <Input
                          id="withdrawal-amount"
                          type="number"
                          placeholder="Enter amount"
                          value={withdrawalAmount}
                          onChange={(e) => setWithdrawalAmount(e.target.value)}
                        />
                        {withdrawalAmount && (
                          <div className="mt-2 text-sm text-gray-600">
                            <p>Fee: {calculateWithdrawalFee(parseFloat(withdrawalAmount)).fee.toFixed(2)} KES</p>
                            <p>You'll receive: {calculateWithdrawalFee(parseFloat(withdrawalAmount)).netAmount.toFixed(2)} KES</p>
                          </div>
                        )}
                      </div>
                      <Button 
                        onClick={handleWithdrawal}
                        disabled={requestWithdrawalMutation.isPending || !withdrawalAmount}
                        className="w-full"
                      >
                        Request Withdrawal
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "services" && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">My Services</h1>
                <Dialog open={serviceModalOpen} onOpenChange={setServiceModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary-dark">
                      <i className="fas fa-plus mr-2"></i>
                      Add Service
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Service</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handleCreateService(new FormData(e.target as HTMLFormElement));
                    }}>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="platform">Platform</Label>
                          <Select name="platform" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose platform" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="instagram">Instagram</SelectItem>
                              <SelectItem value="youtube">YouTube</SelectItem>
                              <SelectItem value="twitter">Twitter</SelectItem>
                              <SelectItem value="tiktok">TikTok</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="type">Service Type</Label>
                          <Select name="type" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose service type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="followers">Followers</SelectItem>
                              <SelectItem value="likes">Likes</SelectItem>
                              <SelectItem value="views">Views</SelectItem>
                              <SelectItem value="comments">Comments</SelectItem>
                              <SelectItem value="subscribers">Subscribers</SelectItem>
                              <SelectItem value="reposts">Reposts</SelectItem>
                              <SelectItem value="shares">Shares</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Input 
                            name="description" 
                            placeholder="Describe your service"
                            required
                          />
                        </div>
                        
                        <Button type="submit" disabled={createServiceMutation.isPending} className="w-full">
                          Create Service
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service: any) => (
                  <Card key={service.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <i className={`fab fa-${service.platform} text-xl mr-2`}></i>
                          <span className="text-sm font-medium text-gray-600 capitalize">{service.platform}</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          service.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {service.status}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-semibold mb-2 capitalize">
                        {service.platform} {service.type}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">{service.description}</p>
                      
                      <div className="flex justify-between text-sm">
                        <span>Orders: {service.totalOrders || 0}</span>
                        <span>Rating: {Number(service.rating || 0).toFixed(1)}</span>
                      </div>
                      
                      <div className="text-right mt-2">
                        <div className="text-lg font-bold text-primary">2 KES</div>
                        <div className="text-xs text-gray-500">earnings per action</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <div>
              <h1 className="text-3xl font-bold mb-8">Order Management</h1>
              
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {transactions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <i className="fas fa-clipboard-list text-4xl mb-4"></i>
                        <p>No orders yet</p>
                      </div>
                    ) : (
                      transactions.map((transaction: any) => (
                        <div key={transaction.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold">Order #{transaction.id}</h3>
                              <p className="text-sm text-gray-600">
                                {transaction.quantity} actions for {transaction.service?.platform}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs ${
                              transaction.status === 'completed' ? 'bg-green-100 text-green-600' :
                              transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                              'bg-red-100 text-red-600'
                            }`}>
                              {transaction.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Target URL:</p>
                              <p className="truncate">{transaction.targetUrl}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Your Earnings:</p>
                              <p className="font-semibold text-green-600">
                                {parseFloat(transaction.providerEarnings || '0').toFixed(2)} KES
                              </p>
                            </div>
                          </div>
                          
                          {transaction.commentText && (
                            <div className="mt-3">
                              <p className="text-gray-600 text-sm">Comment Required:</p>
                              <p className="text-sm bg-gray-50 p-2 rounded">{transaction.commentText}</p>
                            </div>
                          )}
                          
                          {transaction.status === 'pending' && (
                            <div className="mt-4">
                              <Button size="sm" className="mr-2">
                                Mark as Completed
                              </Button>
                              <Button size="sm" variant="outline">
                                Need Help
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "earnings" && (
            <div>
              <h1 className="text-3xl font-bold mb-8">Earnings & Withdrawals</h1>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Withdrawal History</h3>
                    <div className="space-y-3">
                      {withdrawals.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          <p>No withdrawals yet</p>
                        </div>
                      ) : (
                        withdrawals.map((withdrawal: any) => (
                          <div key={withdrawal.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">{parseFloat(withdrawal.amount).toFixed(2)} KES</p>
                              <p className="text-sm text-gray-600">
                                Net: {parseFloat(withdrawal.netAmount).toFixed(2)} KES
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              withdrawal.status === 'completed' ? 'bg-green-100 text-green-600' :
                              withdrawal.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                              'bg-red-100 text-red-600'
                            }`}>
                              {withdrawal.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Earnings Breakdown</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Total Completed Orders:</span>
                        <span className="font-semibold">
                          {transactions.filter((t: any) => t.status === 'completed').length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Earnings:</span>
                        <span className="font-semibold text-green-600">
                          {totalEarnings.toFixed(2)} KES
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pending Earnings:</span>
                        <span className="font-semibold text-yellow-600">
                          {pendingEarnings.toFixed(2)} KES
                        </span>
                      </div>
                      <hr />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Available for Withdrawal:</span>
                        <span className="text-primary">
                          {(user?.balance || 0).toFixed(2)} KES
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}