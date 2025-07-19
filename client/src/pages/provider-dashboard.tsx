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
    if (amount < 100) {
      toast({ title: "Error", description: "Minimum withdrawal is 100 Shillings", variant: "destructive" });
      return;
    }
    requestWithdrawalMutation.mutate(withdrawalAmount);
  };

  // Calculate stats
  const totalEarnings = transactions
    .filter((t: any) => t.status === 'completed')
    .reduce((sum: number, t: any) => sum + parseFloat(t.providerEarnings), 0);
  
  const completedActions = transactions.filter((t: any) => t.status === 'completed').length;
  const pendingActions = transactions.filter((t: any) => t.status === 'pending').length;
  const averageRating = services.length > 0 
    ? services.reduce((sum: number, s: any) => sum + parseFloat(s.rating), 0) / services.length 
    : 0;

  const { fee, netAmount } = withdrawalAmount 
    ? calculateWithdrawalFee(parseFloat(withdrawalAmount) || 0)
    : { fee: 0, netAmount: 0 };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-6">
            <h2 className="text-xl font-bold text-green-600">Provider Dashboard</h2>
            <p className="text-sm text-gray-600 mt-1">Welcome, {user?.name}</p>
          </div>
          
          <nav className="mt-6">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center px-6 py-3 text-left ${
                activeTab === "overview" 
                  ? "text-gray-700 bg-gray-100 border-r-2 border-green-600" 
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
                  ? "text-gray-700 bg-gray-100 border-r-2 border-green-600" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <i className="fas fa-tasks mr-3"></i>
              My Services
            </button>
            
            <button
              onClick={() => setActiveTab("pending")}
              className={`w-full flex items-center px-6 py-3 text-left ${
                activeTab === "pending" 
                  ? "text-gray-700 bg-gray-100 border-r-2 border-green-600" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <i className="fas fa-clock mr-3"></i>
              Pending Actions
            </button>
            
            <button
              onClick={() => setActiveTab("earnings")}
              className={`w-full flex items-center px-6 py-3 text-left ${
                activeTab === "earnings" 
                  ? "text-gray-700 bg-gray-100 border-r-2 border-green-600" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <i className="fas fa-wallet mr-3"></i>
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
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Provider Overview</h1>
                <p className="text-gray-600">Manage your services and track your earnings</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <i className="fas fa-wallet text-green-600 text-xl"></i>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                        <p className="text-2xl font-bold text-gray-900">{totalEarnings.toFixed(2)} Shillings</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <i className="fas fa-check-circle text-primary text-xl"></i>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Completed Actions</p>
                        <p className="text-2xl font-bold text-gray-900">{completedActions}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <i className="fas fa-clock text-yellow-600 text-xl"></i>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Pending Actions</p>
                        <p className="text-2xl font-bold text-gray-900">{pendingActions}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <i className="fas fa-star text-purple-500 text-xl"></i>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Rating</p>
                        <p className="text-2xl font-bold text-gray-900">{averageRating.toFixed(1)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {activeTab === "services" && (
            <>
              <div className="mb-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">My Services</h1>
                    <p className="text-gray-600">Manage the services you offer</p>
                  </div>
                  
                  <Dialog open={serviceModalOpen} onOpenChange={setServiceModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-green-600 hover:bg-green-700">
                        Add New Service
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Service</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        handleCreateService(new FormData(e.currentTarget));
                      }} className="space-y-4">
                        <div>
                          <Label htmlFor="platform">Platform</Label>
                          <Select name="platform" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select platform" />
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
                              <SelectValue placeholder="Select service type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="followers">Followers</SelectItem>
                              <SelectItem value="likes">Likes</SelectItem>
                              <SelectItem value="views">Views</SelectItem>
                              <SelectItem value="comments">Comments</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="description">Description (optional)</Label>
                          <Input name="description" placeholder="Describe your service..." />
                        </div>
                        
                        <Button type="submit" disabled={createServiceMutation.isPending} className="w-full">
                          Create Service
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <Card className="p-6">
                {services.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No services created yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Platform</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Service Type</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Earnings per Action</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Orders</th>
                        </tr>
                      </thead>
                      <tbody>
                        {services.map((service: any) => (
                          <tr key={service.id} className="border-b border-gray-100">
                            <td className="py-3 px-4 capitalize">
                              <div className="flex items-center">
                                <i className={`fab fa-${service.platform} mr-2`}></i>
                                {service.platform}
                              </div>
                            </td>
                            <td className="py-3 px-4 capitalize">{service.type}</td>
                            <td className="py-3 px-4 font-semibold text-green-600">2 Shillings</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                service.status === 'active' 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {service.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">{service.totalOrders}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}

          {activeTab === "pending" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Pending Actions</h1>
                <p className="text-gray-600">Complete these actions to earn money</p>
              </div>

              <Card className="p-6">
                {transactions.filter((t: any) => t.status === 'pending').length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No pending actions</p>
                ) : (
                  <div className="space-y-4">
                    {transactions
                      .filter((t: any) => t.status === 'pending')
                      .map((transaction: any) => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center">
                            <i className={`fab fa-${transaction.service?.platform} text-xl mr-3`}></i>
                            <div>
                              <h4 className="font-medium capitalize">
                                {transaction.service?.type} on {transaction.service?.platform}
                              </h4>
                              <p className="text-sm text-gray-600">
                                Target: {transaction.targetUrl}
                              </p>
                              {transaction.commentText && (
                                <p className="text-sm text-gray-600">
                                  Comment: "{transaction.commentText}"
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                Quantity: {transaction.quantity}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 font-semibold">
                              +{transaction.providerEarnings} Shillings
                            </span>
                            <Button 
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                // In a real app, this would mark the action as completed
                                toast({ title: "Action marked as complete", description: "Earnings will be added to your balance" });
                              }}
                            >
                              Mark Complete
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </Card>
            </>
          )}

          {activeTab === "earnings" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Earnings & Withdrawals</h1>
                <p className="text-gray-600">Manage your earnings and withdrawal requests</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Withdrawal Section */}
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-6">Withdraw Earnings</h2>
                  
                  <div className="bg-green-50 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-green-600 mb-2">Available Balance</h3>
                    <p className="text-2xl font-bold text-green-600">{totalEarnings.toFixed(2)} Shillings</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="withdrawalAmount">Withdrawal Amount</Label>
                      <Input
                        id="withdrawalAmount"
                        type="number"
                        placeholder="Enter amount"
                        value={withdrawalAmount}
                        onChange={(e) => setWithdrawalAmount(e.target.value)}
                        min="100"
                      />
                    </div>
                    
                    {withdrawalAmount && parseFloat(withdrawalAmount) >= 100 && (
                      <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-600">
                        <p className="mb-1">Withdrawal Fee: {fee.toFixed(2)} Shillings (2.9% + 30)</p>
                        <p className="font-semibold">You will receive: {netAmount.toFixed(2)} Shillings</p>
                      </div>
                    )}
                    
                    <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-600">
                      <p className="mb-1">Withdrawal Fee: 2.9% + 30 Shillings</p>
                      <p>Minimum withdrawal: 100 Shillings</p>
                    </div>
                    
                    <Button 
                      onClick={handleWithdrawal}
                      disabled={!withdrawalAmount || parseFloat(withdrawalAmount) < 100 || requestWithdrawalMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Request Withdrawal
                    </Button>
                  </div>
                </Card>
                
                {/* Recent Withdrawals */}
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Recent Withdrawals</h3>
                  
                  {withdrawals.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No withdrawals yet</p>
                  ) : (
                    <div className="space-y-3">
                      {withdrawals.slice(0, 5).map((withdrawal: any) => (
                        <div key={withdrawal.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{withdrawal.amount} Shillings</p>
                            <p className="text-sm text-gray-600">
                              Net: {withdrawal.netAmount} Shillings
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(withdrawal.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            withdrawal.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : withdrawal.status === 'processing'
                              ? 'bg-blue-100 text-blue-800'
                              : withdrawal.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {withdrawal.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
