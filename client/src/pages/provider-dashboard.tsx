import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth.tsx";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation, Link } from "wouter";
import { calculateWithdrawalFee } from "@/lib/paystack";
import AssignmentCard from "@/components/assignment-card";
import ContentValidator from "@/components/content-validator";
import { AIReVerificationRequest } from "@/components/ai-reverification-request";
import { WalletDashboard } from "@/components/wallet-dashboard";

function AIReVerificationSection() {
  const { data: rejectedAssignments = [], refetch } = useQuery({
    queryKey: ['/api/provider/rejected-assignments'],
  });

  const handleReVerificationComplete = () => {
    refetch();
  };

  return (
    <AIReVerificationRequest
      rejectedAssignments={rejectedAssignments}
      onReVerificationComplete={handleReVerificationComplete}
    />
  );
}

export default function ProviderDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [contentValidator, setContentValidator] = useState({ open: false, content: '', contentType: 'description' as const });

  // Redirect if not provider - only redirect if we have user data and they're not a provider
  if (user && user.role !== 'provider') {
    setLocation('/');
    return null;
  }

  // Fetch services from provider-specific API endpoint
  const { data: allServices = [] } = useQuery({
    queryKey: ['/api/services/provider-view'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/services/provider-view');
      return response.json();
    },
  });

  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const { data: transactions = [] } = useQuery({
    queryKey: ['/api/transactions'],
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ['/api/withdrawals'],
  });

  const { data: actionAssignments = [], refetch: refetchActionAssignments } = useQuery({
    queryKey: ['/api/action-assignments'],
  });

  const { data: providerServices = [], refetch: refetchProviderServices } = useQuery({
    queryKey: ['/api/provider-services'],
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

  const completeActionMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      const res = await apiRequest('PATCH', `/api/action-assignments/${assignmentId}`, { 
        status: 'completed' 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/action-assignments'] });
      toast({ title: "Success", description: "Action marked as completed" });
    },
  });

  const handleCompleteAction = (assignmentId: number) => {
    completeActionMutation.mutate(assignmentId);
  };

  const handleServiceSelection = async (service: any, isSelected: boolean) => {
    try {
      if (isSelected) {
        // Remove service
        const providerService = providerServices.find((ps: any) => 
          ps.platform === service.platform && ps.actionType === service.type
        );
        if (providerService) {
          await apiRequest('DELETE', `/api/provider-services/${providerService.id}`);
        }
      } else {
        // Add service
        await apiRequest('POST', '/api/provider-services', {
          platform: service.platform,
          actionType: service.type,
          isActive: true
        });
      }
      
      refetchProviderServices();
      toast({ 
        title: "Success", 
        description: isSelected ? "Service removed" : "Service added" 
      });
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to update service selection", 
        variant: "destructive" 
      });
    }
  };

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

  const totalEarnings = actionAssignments
    .filter((a: any) => a.status === 'completed')
    .reduce((sum: number, a: any) => sum + 2.00, 0);

  const pendingEarnings = actionAssignments
    .filter((a: any) => a.status === 'assigned' || a.status === 'in_progress')
    .reduce((sum: number, a: any) => sum + 2.00, 0);

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
                  {Number(user?.balance || 0).toFixed(2)} KES
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
              onClick={() => setActiveTab("service-selection")}
              className={`w-full flex items-center px-6 py-3 text-left ${
                activeTab === "service-selection" 
                  ? "text-gray-700 bg-gray-100 border-r-2 border-primary" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <i className="fas fa-check-square mr-3"></i>
              Service Selection
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
              onClick={() => setActiveTab("ai-reverification")}
              className={`w-full flex items-center px-6 py-3 text-left ${
                activeTab === "ai-reverification" 
                  ? "text-gray-700 bg-gray-100 border-r-2 border-primary" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <i className="fas fa-robot mr-3"></i>
              AI Re-verification
            </button>
            
            <button
              onClick={() => setActiveTab("earnings")}
              className={`w-full flex items-center px-6 py-3 text-left ${
                activeTab === "earnings" 
                  ? "text-gray-700 bg-gray-100 border-r-2 border-primary" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <i className="fas fa-wallet mr-3"></i>
              Wallet
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
                          <p className="text-2xl font-bold">{selectedServices.length}</p>
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
                        <p className="text-sm font-medium text-gray-600">Total Actions</p>
                        <p className="text-2xl font-bold">{actionAssignments.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Actions</h3>
                    <div className="space-y-3">
                      {actionAssignments.slice(0, 5).map((assignment: any) => (
                        <div key={assignment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">Action #{assignment.id}</p>
                            <p className="text-sm text-gray-600">1 {assignment.actionType} for {assignment.platform}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-green-600">2.00 KES</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              assignment.status === 'completed' ? 'bg-green-100 text-green-600' :
                              assignment.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                              assignment.status === 'assigned' ? 'bg-yellow-100 text-yellow-600' :
                              'bg-red-100 text-red-600'
                            }`}>
                              {assignment.status.replace('_', ' ')}
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
                <h1 className="text-3xl font-bold">Available Services</h1>
                <Button 
                  onClick={() => {
                    // Save selected services to backend
                    apiRequest('POST', '/api/provider/services', { serviceIds: selectedServices })
                      .then(() => {
                        toast({ title: "Success", description: "Services updated successfully" });
                      })
                      .catch(() => {
                        toast({ title: "Error", description: "Failed to update services", variant: "destructive" });
                      });
                  }}
                  className="bg-primary hover:bg-primary-dark"
                  disabled={selectedServices.length === 0}
                >
                  <i className="fas fa-save mr-2"></i>
                  Save Selection ({selectedServices.length} selected)
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allServices.map((service: any) => (
                  <Card 
                    key={service.id} 
                    className={`cursor-pointer transition-all ${
                      selectedServices.includes(service.id) 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => {
                      setSelectedServices(prev => 
                        prev.includes(service.id)
                          ? prev.filter(id => id !== service.id)
                          : [...prev, service.id]
                      );
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <i className={`${service.icon} text-xl mr-2`}></i>
                          <span className="text-sm font-medium text-gray-600 capitalize">{service.platform}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            selectedServices.includes(service.id) 
                              ? 'bg-primary text-white' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {selectedServices.includes(service.id) ? 'Selected' : 'Available'}
                          </span>
                          <input
                            type="checkbox"
                            checked={selectedServices.includes(service.id)}
                            onChange={() => {}} // Handled by card click
                            className="w-4 h-4 text-primary"
                          />
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-semibold mb-2">
                        {service.name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">{service.providerDescription}</p>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Your Earnings:</span>
                          <span className="font-semibold text-green-600">{service.providerPrice.toFixed(2)} KES</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Delivery:</span>
                          <span>{service.deliveryTime}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t">
                        <div className="text-xs text-gray-500 mb-2">Requirements:</div>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {service.requirements.map((req, index) => (
                            <li key={index} className="flex items-center">
                              <i className="fas fa-check text-green-500 mr-2 text-xs"></i>
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === "service-selection" && (
            <div>
              <h1 className="text-3xl font-bold mb-8">Select Services to Offer</h1>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Select which services you want to offer. You'll only receive orders for services you've selected.
                  The system will prioritize providers with better performance history.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allServices.map((service: any) => {
                  const isSelected = providerServices.some((ps: any) => 
                    ps.platform === service.platform && ps.actionType === service.type
                  );
                  
                  return (
                    <Card 
                      key={service.id} 
                      className={`cursor-pointer transition-all ${
                        isSelected 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => handleServiceSelection(service, isSelected)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <i className={`${service.icon} text-xl mr-2`}></i>
                            <span className="text-sm font-medium text-gray-600 capitalize">{service.platform}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              isSelected 
                                ? 'bg-primary text-white' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {isSelected ? 'Selected' : 'Available'}
                            </span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // Handled by card click
                              className="w-4 h-4 text-primary"
                            />
                          </div>
                        </div>
                        
                        <h3 className="text-lg font-semibold mb-2">
                          {service.name}
                        </h3>
                        <p className="text-gray-600 text-sm mb-4">{service.providerDescription}</p>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Your Earnings:</span>
                            <span className="font-semibold text-green-600">2.00 KES</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Platform:</span>
                            <span className="capitalize">{service.platform}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Action Type:</span>
                            <span className="capitalize">{service.type}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <div>
              <h1 className="text-3xl font-bold mb-8">Action Assignments</h1>
              
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {actionAssignments.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <i className="fas fa-clipboard-list text-4xl mb-4"></i>
                        <p>No action assignments yet</p>
                        <p className="text-sm mt-2">You'll see individual actions here when buyers purchase services you offer</p>
                      </div>
                    ) : (
                      actionAssignments.map((assignment: any) => (
                        <div key={assignment.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold">Action #{assignment.id}</h3>
                              <p className="text-sm text-gray-600">
                                1 {assignment.actionType} for {assignment.platform}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs ${
                              assignment.status === 'completed' ? 'bg-green-100 text-green-600' :
                              assignment.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                              assignment.status === 'assigned' ? 'bg-yellow-100 text-yellow-600' :
                              'bg-red-100 text-red-600'
                            }`}>
                              {assignment.status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Target URL:</p>
                              <p className="truncate">{assignment.targetUrl}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Your Earnings:</p>
                              <p className="font-semibold text-green-600">
                                2.00 KES
                              </p>
                            </div>
                          </div>
                          
                          {assignment.commentText && (
                            <div className="mt-3">
                              <p className="text-gray-600 text-sm">Comment Required:</p>
                              <p className="text-sm bg-gray-50 p-2 rounded">{assignment.commentText}</p>
                            </div>
                          )}
                          
                          {assignment.status === 'assigned' && (
                            <div className="mt-4">
                              <Button 
                                size="sm" 
                                className="mr-2"
                                onClick={() => handleCompleteAction(assignment.id)}
                              >
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

          {activeTab === "ai-reverification" && (
            <div>
              <h1 className="text-3xl font-bold mb-8">AI Re-verification</h1>
              <AIReVerificationSection />
            </div>
          )}

          {activeTab === "earnings" && (
            <div>
              <h1 className="text-3xl font-bold mb-8">Wallet</h1>
              <WalletDashboard />
            </div>
          )}
        </div>
      </div>

      {/* Content Validator Dialog */}
      <Dialog open={contentValidator.open} onOpenChange={(open) => setContentValidator(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Content Validation</DialogTitle>
          </DialogHeader>
          <ContentValidator
            content={contentValidator.content}
            contentType={contentValidator.contentType}
            onValidationComplete={(isValid, issues) => {
              if (isValid) {
                toast({
                  title: 'Content Validated',
                  description: 'Your content is appropriate and ready to use!'
                });
              } else {
                toast({
                  title: 'Content Issues Found',
                  description: 'Please review the validation results before proceeding.',
                  variant: 'destructive'
                });
              }
            }}
            onClose={() => setContentValidator(prev => ({ ...prev, open: false }))}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}