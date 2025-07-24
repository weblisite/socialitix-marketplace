import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth.tsx";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { AvailableAssignments } from "@/components/available-assignments";
import { SubmissionModal } from "@/components/submission-modal";
import { WithdrawalForm } from "@/components/withdrawal-form";

export default function ProviderDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [proofModal, setProofModal] = useState({
    open: false,
    assignmentId: 0,
    proofUrl: '',
    proofType: 'screenshot' as 'screenshot' | 'manual'
  });
  const [serviceFilter, setServiceFilter] = useState('all');
  const [serviceSearch, setServiceSearch] = useState('');
  const [submissionModal, setSubmissionModal] = useState({
    open: false,
    assignmentId: '',
    assignment: null
  });
  const [claimingIds, setClaimingIds] = useState<Set<string>>(new Set());
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  // Role switching mutation
  const switchRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      const response = await apiRequest('PATCH', '/api/user/role', { role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      toast({
        title: "Role updated!",
        description: "Your role has been updated successfully. Please refresh the page.",
      });
      // Refresh the page to update the user context
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  // Fetch provider assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['/api/provider/assignments'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/provider/assignments');
      return response.json();
    },
    enabled: user?.role === 'provider', // Only fetch if user is provider
  });

  // Fetch provider services
  const { data: providerServices = [] } = useQuery({
    queryKey: ['/api/provider/services'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/provider/services');
      return response.json();
    },
    enabled: user?.role === 'provider', // Only fetch if user is provider
  });

  // Fetch available services for selection
  const { data: availableServices = [] } = useQuery({
    queryKey: ['/api/services/provider-view'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/services/provider-view');
      return response.json();
    },
    enabled: user?.role === 'provider', // Only fetch if user is provider
  });

  // Fetch available assignments
  const { data: availableAssignments = [] } = useQuery({
    queryKey: ['/api/provider/available-assignments'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/provider/available-assignments');
      return response.json();
    },
    enabled: user?.role === 'provider', // Only fetch if user is provider
  });

  // Update provider services mutation
  const updateServicesMutation = useMutation({
    mutationFn: async (serviceIds: string[]) => {
      const response = await apiRequest('POST', '/api/provider/services', {
        serviceIds
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/provider/services'] });
      toast({
        title: "Services updated!",
        description: "Your service offerings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update services",
        variant: "destructive",
      });
    },
  });

  // Fetch transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/transactions"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: user?.role === 'provider', // Only fetch if user is provider
  }) as { data: any[] };

  // Fetch withdrawals
  const { data: withdrawals = [] } = useQuery({
    queryKey: ['/api/withdrawals'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/withdrawals');
      return response.json();
    },
    enabled: user?.role === 'provider', // Only fetch if user is provider
  });

  // Calculate available balance
  const totalEarnings = transactions.reduce((sum: number, t: any) => sum + (t.provider_earnings || 0), 0);
  const totalWithdrawn = withdrawals.reduce((sum: number, w: any) => sum + (parseFloat(w.amount) || 0), 0);
  const availableBalance = totalEarnings - totalWithdrawn;

  // Start assignment mutation
  const startAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      const response = await apiRequest('POST', `/api/assignments/${assignmentId}/start`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/provider/assignments'] });
      toast({
        title: "Assignment started!",
        description: "You have successfully started the assignment.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start assignment",
        variant: "destructive",
      });
    },
  });

  // Submit proof mutation
  const submitProofMutation = useMutation({
    mutationFn: async (data: { assignmentId: number; proofUrl: string; proofType: string }) => {
      const response = await apiRequest('POST', `/api/assignments/${data.assignmentId}/submit-proof`, {
        proofUrl: data.proofUrl,
        proofType: data.proofType
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/provider/assignments'] });
      setProofModal({ open: false, assignmentId: 0, proofUrl: '', proofType: 'screenshot' });
      toast({
        title: "Proof submitted!",
        description: "Your proof has been submitted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit proof",
        variant: "destructive",
      });
    },
  });

  // Check if user is a provider
  if (user?.role !== 'provider') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="mb-6">
            <i className="fas fa-user-shield text-6xl text-lime-500 mb-4"></i>
            <h1 className="text-2xl font-bold text-white mb-2">Provider Access Required</h1>
            <p className="text-gray-400 mb-6">
              This dashboard is only available for providers. You are currently logged in as a {user?.role}.
            </p>
          </div>
          
          <div className="space-y-4">
            <Button
              onClick={() => setLocation('/buyer')}
              className="w-full bg-lime-500 hover:bg-lime-600 text-white"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Go to Buyer Dashboard
            </Button>
            
            {user?.role === 'buyer' && (
              <Button
                onClick={() => switchRoleMutation.mutate('provider')}
                disabled={switchRoleMutation.isPending}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                <i className="fas fa-exchange-alt mr-2"></i>
                {switchRoleMutation.isPending ? 'Switching...' : 'Switch to Provider'}
              </Button>
            )}
            
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-2">Want to become a provider?</p>
              <Button
                variant="outline"
                onClick={() => {
                  logout();
                  setLocation('/auth');
                }}
                className="w-full border-lime-500 text-lime-500 hover:bg-lime-500/10"
              >
                <i className="fas fa-user-plus mr-2"></i>
                Create Provider Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle service selection
  const handleServiceToggle = (serviceId: string) => {
    const isSelected = providerServices.some((service: any) => service.id === serviceId);
    const currentServiceIds = providerServices.map((service: any) => service.id);
    
    let newServiceIds: string[];
    if (isSelected) {
      // Remove service
      newServiceIds = currentServiceIds.filter((id: string) => id !== serviceId);
    } else {
      // Add service
      newServiceIds = [...currentServiceIds, serviceId];
    }
    
    updateServicesMutation.mutate(newServiceIds);
  };

  // Handle available assignment claimed
  const handleAssignmentClaimed = async (assignmentId: number) => {
    setClaimingIds(prev => new Set(prev).add(assignmentId.toString()));

    try {
      const response = await apiRequest('POST', `/api/provider/claim-assignment/${assignmentId}`, {});
      
      if (response.ok) {
        toast({
          title: "Success!",
          description: "Assignment claimed successfully. You can now work on it.",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/provider/available-assignments'] });
        queryClient.invalidateQueries({ queryKey: ['/api/provider/assignments'] });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to claim assignment",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to claim assignment",
        variant: "destructive",
      });
    } finally {
      setClaimingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(assignmentId.toString());
        return newSet;
      });
    }
  };

  // Handle submission modal
  const handleSubmissionComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/provider/assignments'] });
    queryClient.invalidateQueries({ queryKey: ['/api/provider/submissions'] });
  };

  const openSubmissionModal = (assignment: any) => {
    setSubmissionModal({
      open: true,
      assignmentId: assignment.id,
      assignment
    });
  };

  const closeSubmissionModal = () => {
    setSubmissionModal({
      open: false,
      assignmentId: '',
      assignment: null
    });
  };

  const handleStartAssignment = (assignmentId: number) => {
    startAssignmentMutation.mutate(assignmentId);
  };

  const handleSubmitProof = () => {
    if (proofModal.proofUrl.trim()) {
      submitProofMutation.mutate({
        assignmentId: proofModal.assignmentId,
        proofUrl: proofModal.proofUrl,
        proofType: proofModal.proofType
      });
    }
  };

  const openProofModal = (assignment: any) => {
    setSelectedAssignment(assignment);
    setProofModal({
      open: true,
      assignmentId: assignment.id,
      proofUrl: '',
      proofType: 'screenshot'
    });
  };

  // Platform icons mapping
  const platformIcons: Record<string, string> = {
    instagram: "fab fa-instagram text-pink-500",
    youtube: "fab fa-youtube text-red-500",
    twitter: "fab fa-twitter text-blue-500",
    tiktok: "fab fa-tiktok text-black",
    facebook: "fab fa-facebook text-blue-600",
  };

  // Filter available services
  const filteredServices = availableServices.filter((service: any) => {
    const matchesFilter = serviceFilter === 'all' || service.platform === serviceFilter;
    const matchesSearch = service.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                         service.platform.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                         service.type.toLowerCase().includes(serviceSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Helper to get a descriptive earning message
  const getEarningDescription = (service: any) => {
    const actionType = service.action_type || service.type;
    const platform = service.platform;
    
    // Helper to get the correct article
    const getArticle = (word: string) => {
      const vowels = ['a', 'e', 'i', 'o', 'u'];
      return vowels.includes(word.toLowerCase()[0]) ? 'an' : 'a';
    };
    
    switch (actionType) {
      case 'followers':
        return `following ${getArticle(platform)} ${platform} account`;
      case 'likes':
        return `liking ${getArticle(platform)} ${platform} post`;
      case 'comments':
        return `commenting on ${getArticle(platform)} ${platform} post`;
      case 'subscribers':
        return `subscribing to ${getArticle(platform)} ${platform} channel`;
      case 'views':
        return `watching ${getArticle(platform)} ${platform} video`;
      case 'shares':
        return `sharing ${getArticle(platform)} ${platform} post`;
      case 'retweets':
        return `retweeting ${getArticle(platform)} ${platform} post`;
      case 'visits':
        return `visiting ${getArticle(platform)} ${platform} profile`;
      default:
        return `${actionType} on ${getArticle(platform)} ${platform} account`;
    }
  };

  // Redirect to landing page if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to landing page if user is not a provider
  if (user.role !== 'provider') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-4">You don't have permission to access the provider dashboard.</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-lime-500 hover:bg-lime-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Mobile Header */}
      <div className="lg:hidden bg-gray-900/80 backdrop-blur-lg border-b border-gray-800 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mr-3 text-gray-300 hover:text-lime-500 hover:bg-gray-800"
            >
              <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
            </Button>
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-lime-500 to-lime-400 bg-clip-text text-transparent">
                Provider Dashboard
              </h2>
              <p className="text-xs text-white">Welcome, {user?.full_name || user?.name || 'User'}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={logout}
            className="border-gray-700 bg-gray-800 text-white hover:border-lime-500 hover:text-lime-500 hover:bg-gray-700"
          >
            <i className="fas fa-sign-out-alt mr-2"></i>
            Logout
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <div className={`${mobileMenuOpen ? 'block' : 'hidden'} lg:block w-full lg:w-64 bg-gray-900/90 backdrop-blur-lg border-r border-gray-800 min-h-screen lg:h-screen lg:fixed lg:top-0 lg:left-0 top-0 left-0 z-40 lg:z-auto pt-16 lg:pt-0 lg:flex lg:flex-col`}>
          {/* Desktop Header */}
          <div className="hidden lg:block p-6 border-b border-gray-800">
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-lime-500 to-lime-400 bg-clip-text text-transparent">
                Provider Dashboard
              </h2>
              <p className="text-sm text-white mt-1">Welcome, {user?.full_name || user?.name || 'User'}</p>
            </div>
          </div>
          
          <nav className="mt-6 p-4 lg:flex lg:flex-col lg:flex-1 lg:justify-between">
            <div>
              <button
                onClick={() => {
                  setActiveTab("overview");
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center px-4 py-3 text-left text-sm rounded-xl transition-all duration-200 ${
                  activeTab === "overview" 
                    ? "bg-gradient-to-r from-lime-500/20 to-lime-600/20 text-lime-400 border border-lime-500/30" 
                    : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-300"
                }`}
              >
                <i className="fas fa-chart-line mr-3 text-lg"></i>
                Overview
              </button>
              
              <button
                onClick={() => {
                  setActiveTab("assignments");
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center px-4 py-3 text-left text-sm rounded-xl transition-all duration-200 mt-2 ${
                  activeTab === "assignments" 
                    ? "bg-gradient-to-r from-lime-500/20 to-lime-600/20 text-lime-400 border border-lime-500/30" 
                    : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-300"
                }`}
              >
                <i className="fas fa-tasks mr-3 text-lg"></i>
                Available Assignments
              </button>
              
              <button
                onClick={() => {
                  setActiveTab("services");
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center px-4 py-3 text-left text-sm rounded-xl transition-all duration-200 mt-2 ${
                  activeTab === "services" 
                    ? "bg-gradient-to-r from-lime-500/20 to-lime-600/20 text-lime-400 border border-lime-500/30" 
                    : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-300"
                }`}
              >
                <i className="fas fa-cog mr-3 text-lg"></i>
                My Services
              </button>
              
              <button
                onClick={() => {
                  setActiveTab("earnings");
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center px-4 py-3 text-left text-sm rounded-xl transition-all duration-200 mt-2 ${
                  activeTab === "earnings" 
                    ? "bg-gradient-to-r from-lime-500/20 to-lime-600/20 text-lime-400 border border-lime-500/30" 
                    : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-300"
                }`}
              >
                <i className="fas fa-coins mr-3 text-lg"></i>
                Earnings
              </button>
              
              <button
                onClick={logout}
                className="w-full flex items-center px-4 py-3 text-gray-400 hover:bg-gray-800/50 hover:text-gray-300 text-left text-sm rounded-xl transition-all duration-200 mt-2 lg:hidden"
              >
                <i className="fas fa-sign-out-alt mr-3 text-lg"></i>
                Logout
              </button>
            </div>
            
            {/* Desktop Logout Button */}
            <div className="hidden lg:block pt-6 border-t border-gray-800">
              <button
                onClick={logout}
                className="w-full flex items-center px-4 py-3 text-gray-400 hover:bg-gray-800/50 hover:text-gray-300 text-left text-sm rounded-xl transition-all duration-200"
              >
                <i className="fas fa-sign-out-alt mr-3 text-lg"></i>
                Logout
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
        )}

        {/* Main Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 lg:ml-64">
          {activeTab === "overview" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Provider Overview</h1>
                <p className="text-gray-400">Monitor your performance and earnings</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="bg-black/80 border-gray-800 hover:border-lime-500/30 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-300 font-medium text-sm">Total Assignments</p>
                        <p className="text-3xl font-bold text-white">{assignments.length}</p>
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                        <i className="fas fa-tasks text-white text-xl"></i>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/80 border-gray-800 hover:border-lime-500/30 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-300 font-medium text-sm">Total Earnings</p>
                        <p className="text-3xl font-bold text-lime-500">
                          {transactions?.reduce((sum: number, t: any) => sum + (t.provider_earnings || 0), 0).toFixed(2) || '0.00'} KES
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-br from-lime-500 to-lime-600 rounded-xl flex items-center justify-center">
                        <i className="fas fa-coins text-white text-xl"></i>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/80 border-gray-800 hover:border-lime-500/30 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-300 font-medium text-sm">Active Tasks</p>
                        <p className="text-3xl font-bold text-yellow-500">
                          {assignments?.filter((a: any) => a.status === 'in_progress').length || 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                        <i className="fas fa-clock text-white text-xl"></i>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/80 border-gray-800 hover:border-lime-500/30 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-300 font-medium text-sm">Completed</p>
                        <p className="text-3xl font-bold text-green-500">
                          {assignments?.filter((a: any) => a.status === 'completed').length || 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                        <i className="fas fa-check-circle text-white text-xl"></i>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
                  {!assignments || assignments.length === 0 ? (
                    <div className="text-center py-8">
                      <i className="fas fa-tasks text-4xl text-gray-600 mb-4"></i>
                      <p className="text-gray-300">No assignments yet. Check the Available Assignments tab!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {assignments.slice(0, 5).map((assignment: any) => (
                        <div key={assignment.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-xl border border-gray-600">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-lime-500 to-lime-600 rounded-lg flex items-center justify-center">
                              <i className="fas fa-tasks text-white"></i>
                            </div>
                            <div>
                              <p className="text-white font-medium capitalize">
                                {assignment.platform} {assignment.action_type}
                              </p>
                              <p className="text-gray-300 text-sm">
                                {new Date(assignment.assigned_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lime-500 font-semibold">5.00 KES</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              assignment.status === 'completed' 
                                ? 'bg-green-500/20 text-green-400' 
                                : assignment.status === 'in_progress'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {assignment.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "assignments" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Available Assignments</h1>
                <p className="text-gray-400">Complete tasks to earn money</p>
              </div>

              {assignmentsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 animate-pulse">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gray-700 rounded-xl"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                              <div className="h-3 bg-gray-700 rounded w-1/2 mt-2"></div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-3 bg-gray-700 rounded"></div>
                            <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {availableAssignments.map((assignment: any) => (
                    <Card key={assignment.id} className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-lime-500/30 transition-all duration-300 group">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-lime-500 to-lime-600 rounded-xl flex items-center justify-center shadow-lg">
                              <i className={`${platformIcons[assignment.platform]} text-xl text-white`}></i>
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-white capitalize">
                                {assignment.platform} {assignment.action_type}
                              </h3>
                              <p className="text-gray-300 text-sm">Assignment #{assignment.id}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-lime-500">{assignment.provider_earnings} KES</div>
                            <div className="text-gray-300 text-sm">per action</div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Target URL</label>
                            <p className="text-sm text-gray-300 break-all bg-gray-700/50 p-3 rounded-lg border border-gray-600">
                              {assignment.target_url}
                            </p>
                          </div>

                          {assignment.comment_text && (
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Instructions</label>
                              <p className="text-sm text-gray-300 bg-gray-700/50 p-3 rounded-lg border border-gray-600">
                                {assignment.comment_text}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                            <div className="text-sm text-gray-300">
                              Expires: {new Date(assignment.expires_at).toLocaleDateString()}
                            </div>
                            <div className="space-x-2">
                              <Button
                                onClick={() => handleAssignmentClaimed(assignment.id)}
                                disabled={claimingIds.has(assignment.id.toString())}
                                className="bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white font-semibold px-4 py-2 rounded-xl shadow-lg hover:shadow-lime-500/25 transition-all duration-300"
                              >
                                {claimingIds.has(assignment.id.toString()) ? (
                                  <i className="fas fa-spinner fa-spin mr-2"></i>
                                ) : (
                                  <i className="fas fa-hand-paper mr-2"></i>
                                )}
                                Claim Assignment
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {assignments.filter((a: any) => a.status === 'assigned').length === 0 && !assignmentsLoading && (
                <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
                  <CardContent className="p-8 text-center">
                    <i className="fas fa-tasks text-4xl text-gray-600 mb-4"></i>
                    <h3 className="text-xl font-semibold text-white mb-2">No Available Assignments</h3>
                    <p className="text-gray-300">Check back later for new tasks to complete!</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {activeTab === "services" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">My Services</h1>
                <p className="text-gray-400">Manage your service offerings</p>
              </div>

              <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-800">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Active Services</h3>
                  {providerServices.length === 0 ? (
                    <div className="text-center py-8">
                      <i className="fas fa-cog text-4xl text-gray-600 mb-4"></i>
                      <p className="text-gray-400">No services configured yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {providerServices.map((service: any) => (
                        <div key={service.id} className="flex items-center justify-between p-4 bg-gray-900/80 rounded-xl border border-gray-700">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-lime-500 to-lime-600 rounded-lg flex items-center justify-center">
                              <i className={`${platformIcons[service.platform]} text-white`}></i>
                            </div>
                            <div>
                              <p className="text-white font-medium capitalize">
                                {service.platform} {service.action_type || service.type}
                              </p>
                              <p className="text-gray-400 text-sm">
                                {service.description}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lime-500 font-semibold">5.00 KES</p>
                            <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                              Active
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="mt-8">
                <h3 className="text-xl font-semibold text-white mb-4">Available Services</h3>
                <p className="text-gray-400">Select services you want to offer</p>
                
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Search services..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-lime-500 focus:ring-lime-500/20"
                    />
                  </div>
                  <Select value={serviceFilter} onValueChange={setServiceFilter}>
                    <SelectTrigger className="w-full sm:w-48 bg-gray-800 border-gray-700 text-white focus:border-lime-500 focus:ring-lime-500/20">
                      <SelectValue placeholder="Filter by platform" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all" className="text-white hover:bg-gray-700">All Platforms</SelectItem>
                      <SelectItem value="instagram" className="text-white hover:bg-gray-700">Instagram</SelectItem>
                      <SelectItem value="youtube" className="text-white hover:bg-gray-700">YouTube</SelectItem>
                      <SelectItem value="twitter" className="text-white hover:bg-gray-700">Twitter</SelectItem>
                      <SelectItem value="tiktok" className="text-white hover:bg-gray-700">TikTok</SelectItem>
                      <SelectItem value="facebook" className="text-white hover:bg-gray-700">Facebook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {filteredServices.map((service: any) => (
                    <div key={service.id} className="flex flex-col p-4 bg-gray-900/80 rounded-xl border border-gray-700">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-lime-500 to-lime-600 rounded-lg flex items-center justify-center">
                          <i className={`${platformIcons[service.platform]} text-white`}></i>
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium capitalize">
                            {service.platform} {service.action_type || service.type}
                          </p>
                          <p className="text-lime-400 text-sm font-semibold">
                            Earn {service.providerPrice || service.providerEarnings || 5} KES per action
                          </p>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {service.providerDescription || service.description}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-auto">
                        <div className="text-xs text-gray-400">
                          <p>Earn {service.providerPrice || service.providerEarnings || 5} KES for {getEarningDescription(service)}</p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => handleServiceToggle(service.id)}
                          className={`text-lime-500 hover:text-lime-400 hover:bg-lime-500/10 border-lime-500 ${
                            providerServices.some((ps: any) => ps.id === service.id)
                              ? 'bg-lime-500/10'
                              : ''
                          }`}
                        >
                          {providerServices.some((ps: any) => ps.id === service.id) ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === "earnings" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Earnings & Withdrawals</h1>
                <p className="text-gray-400">Track your income and manage withdrawals</p>
              </div>

              {/* Earnings Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-gray-300 text-sm">Total Earnings</p>
                      <p className="text-3xl font-bold text-lime-500">
                        {totalEarnings.toFixed(2)} KES
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-gray-300 text-sm">This Month</p>
                      <p className="text-3xl font-bold text-blue-500">
                        {transactions
                          .filter((t: any) => new Date(t.created_at).getMonth() === new Date().getMonth())
                          .reduce((sum: number, t: any) => sum + (t.provider_earnings || 0), 0).toFixed(2)} KES
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-gray-300 text-sm">Available Balance</p>
                      <p className="text-3xl font-bold text-green-500">
                        {availableBalance.toFixed(2)} KES
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Withdrawal Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Withdrawal Request */}
                <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-white">Request Withdrawal</h3>
                      <Button
                        onClick={() => setShowWithdrawalModal(true)}
                        disabled={availableBalance <= 0}
                        className="bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white"
                      >
                        <i className="fas fa-download mr-2"></i>
                        Withdraw
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Available for withdrawal:</span>
                        <span className="text-white font-semibold">KES {availableBalance.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Minimum withdrawal:</span>
                        <span className="text-white">KES 100.00</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Transaction fee:</span>
                        <span className="text-white">3% of amount</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Withdrawal History */}
                <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Recent Withdrawals</h3>
                    {withdrawals.length === 0 ? (
                      <div className="text-center py-4">
                        <i className="fas fa-history text-2xl text-gray-600 mb-2"></i>
                        <p className="text-gray-300 text-sm">No withdrawal history</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {withdrawals.slice(0, 3).map((withdrawal: any) => (
                          <div key={withdrawal.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                            <div>
                              <p className="text-white font-medium capitalize">
                                {withdrawal.payment_method.replace('_', ' ')}
                              </p>
                              <p className="text-gray-300 text-xs">
                                {new Date(withdrawal.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lime-500 font-semibold">
                                -{parseFloat(withdrawal.amount).toFixed(2)} KES
                              </p>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                withdrawal.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                withdrawal.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                withdrawal.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {withdrawal.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Transaction History */}
              <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Earnings History</h3>
                  {transactions.length === 0 ? (
                    <div className="text-center py-8">
                      <i className="fas fa-coins text-4xl text-gray-600 mb-4"></i>
                      <p className="text-gray-300">No transactions yet. Complete assignments to start earning!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {transactions.map((transaction: any) => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-xl border border-gray-600">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-lime-500 to-lime-600 rounded-lg flex items-center justify-center">
                              <i className="fas fa-coins text-white"></i>
                            </div>
                            <div>
                              <p className="text-white font-medium capitalize">
                                {transaction.platform} {transaction.action_type}
                              </p>
                              <p className="text-gray-300 text-sm">
                                {new Date(transaction.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lime-500 font-semibold">
                              +{transaction.provider_earnings || 0} KES
                            </p>
                            <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                              Completed
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Proof Submission Modal */}
      {proofModal.open && selectedAssignment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Submit Proof</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setProofModal({ open: false, assignmentId: 0, proofUrl: '', proofType: 'screenshot' })}
                className="text-gray-400 hover:text-white"
              >
                <i className="fas fa-times"></i>
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Assignment</label>
                <p className="text-white bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                  {selectedAssignment.platform} {selectedAssignment.action_type}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Proof URL</label>
                <Input
                  type="url"
                  placeholder="https://example.com/proof.jpg"
                  value={proofModal.proofUrl}
                  onChange={(e) => setProofModal(prev => ({ ...prev, proofUrl: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-lime-500 focus:ring-lime-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Proof Type</label>
                <Select value={proofModal.proofType} onValueChange={(value: 'screenshot' | 'manual') => setProofModal(prev => ({ ...prev, proofType: value }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white focus:border-lime-500 focus:ring-lime-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="screenshot" className="text-white hover:bg-gray-700">Screenshot</SelectItem>
                    <SelectItem value="manual" className="text-white hover:bg-gray-700">Manual Verification</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t border-gray-800 pt-6">
                <div className="space-y-3">
                  <Button
                    onClick={handleSubmitProof}
                    disabled={submitProofMutation.isPending}
                    className="w-full bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-lime-500/25 transition-all duration-300"
                  >
                    {submitProofMutation.isPending ? (
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                    ) : (
                      <i className="fas fa-paper-plane mr-2"></i>
                    )}
                    Submit Proof
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setProofModal({ open: false, assignmentId: 0, proofUrl: '', proofType: 'screenshot' })}
                    className="w-full border-gray-700 text-gray-300 hover:border-lime-500 hover:text-lime-500"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <WithdrawalForm
              currentBalance={availableBalance}
              onSuccess={() => {
                setShowWithdrawalModal(false);
                queryClient.invalidateQueries({ queryKey: ['/api/withdrawals'] });
                queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
                toast({
                  title: "Withdrawal requested",
                  description: "Your withdrawal request has been submitted successfully.",
                });
              }}
              onCancel={() => setShowWithdrawalModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}