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
import ReportModal from "@/components/report-modal";
import PaymentModal from "@/components/payment-modal";
import { PendingVerifications } from "@/components/pending-verifications";

export default function BuyerDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [ordersSubTab, setOrdersSubTab] = useState("transactions");
  const [filters, setFilters] = useState({ platform: "all", type: "all" });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // State for checkout modal
  const [checkoutModal, setCheckoutModal] = useState({
    open: false,
    service: null as any,
    quantity: 1,
    commentText: '',
    targetUrl: ''
  });

  // State for payment modal
  const [paymentModal, setPaymentModal] = useState({
    open: false,
    service: null as any,
    quantity: 1,
    totalCost: 0,
    targetUrl: '',
    commentText: ''
  });

  // State for report modal
  const [reportModal, setReportModal] = useState({
    open: false,
    targetType: 'assignment' as 'user' | 'service' | 'transaction' | 'content' | 'assignment',
    targetId: 0,
    targetName: ''
  });

  // Fetch services from API
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const response = await fetch('/api/services');
      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }
      return response.json();
    },
  });

  // Fetch transactions for order history
  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/transactions"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  }) as { data: any[] };

  // Filter services based on selected filters
  const filteredServices = services.filter((service: any) => {
    if (filters.platform !== "all" && service.platform !== filters.platform) return false;
    if (filters.type !== "all" && service.type !== filters.type) return false;
    return true;
  });

  // Handle Buy Now
  const handleBuyNow = (service: any) => {
    setCheckoutModal({ 
      open: true, 
      service, 
      quantity: 1,
      commentText: '', 
      targetUrl: '' 
    });
  };

  // Handle purchase completion
  const handlePurchase = () => {
    if (!checkoutModal.service) return;
    
    const totalCost = checkoutModal.quantity * checkoutModal.service.buyerPrice;
    
    setPaymentModal({
      open: true,
      service: checkoutModal.service,
      quantity: checkoutModal.quantity,
      totalCost: totalCost,
      targetUrl: checkoutModal.targetUrl,
      commentText: checkoutModal.commentText
    });
    
    setCheckoutModal({ open: false, service: null, quantity: 1, commentText: '', targetUrl: '' });
  };

  // Handle payment success
  const handlePaymentSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    
    toast({
      title: "Order placed successfully!",
      description: "Your order has been submitted and will be processed shortly.",
    });
  };

  // Fetch submissions from providers for verification
  const { data: submissions = [] } = useQuery({
    queryKey: ['/api/buyer/submissions'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/buyer/submissions');
      return response.json();
    },
  });

  // Redirect if not buyer
  if (user && user.role !== 'buyer') {
    setLocation('/');
    return null;
  }

  const platformIcons: Record<string, string> = {
    instagram: "fab fa-instagram text-pink-500",
    youtube: "fab fa-youtube text-red-500",
    twitter: "fab fa-twitter text-blue-500",
    tiktok: "fab fa-tiktok text-black",
    facebook: "fab fa-facebook text-blue-600",
  };

  const ServiceCard = ({ service }: { service: any }) => {
    const [quantity, setQuantity] = useState(1);
    const [commentText, setCommentText] = useState("");
    const [targetUrl, setTargetUrl] = useState("");

    const handleQuantityChange = (value: number | string) => {
      const numValue = typeof value === 'string' ? parseInt(value) : value;
      setQuantity(Math.max(1, Math.min(10000, numValue)));
    };

    const handleCustomQuantityChange = (value: string) => {
      const numValue = parseInt(value) || 1;
      setQuantity(Math.max(1, Math.min(10000, numValue)));
    };

    return (
      <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-lime-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-lime-500/10 group">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-lime-500 to-lime-600 rounded-xl flex items-center justify-center shadow-lg">
                <i className={`${platformIcons[service.platform]} text-xl text-white`}></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white capitalize">
                  {service.platform} {service.type}
                </h3>
                <p className="text-gray-300 text-sm">{service.buyerDescription}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-lime-500">
                {service.buyerPrice} KES
              </div>
              <div className="text-gray-300 text-sm">per action</div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target URL (Required)
              </label>
              <Input
                type="url"
                placeholder={service.urlPlaceholder || `https://${service.platform}.com/your_${service.type}`}
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-lime-500 focus:ring-lime-500/20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Comment (Optional)
              </label>
              <Textarea
                placeholder="Add any specific instructions..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-lime-500 focus:ring-lime-500/20"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Quantity (Minimum: 20)
              </label>
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  {[20, 50, 100, 200].map((preset) => (
                    <Button
                      key={preset}
                      variant={quantity === preset ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleQuantityChange(preset)}
                      className={`${
                        quantity === preset 
                          ? 'bg-lime-500 hover:bg-lime-600 text-white border-lime-500' 
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-lime-500 hover:text-lime-500'
                      } transition-all duration-200`}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[500, 1000, 2000, 5000].map((preset) => (
                    <Button
                      key={preset}
                      variant={quantity === preset ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleQuantityChange(preset)}
                      className={`${
                        quantity === preset 
                          ? 'bg-lime-500 hover:bg-lime-600 text-white border-lime-500' 
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-lime-500 hover:text-lime-500'
                      } transition-all duration-200`}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(quantity - 10)}
                    disabled={quantity <= 20}
                    className="bg-gray-800 border-gray-700 text-gray-300 hover:border-lime-500 hover:text-lime-500 disabled:opacity-50"
                  >
                    <i className="fas fa-minus text-xs"></i>
                  </Button>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => handleCustomQuantityChange(e.target.value)}
                    min="20"
                    className="flex-1 bg-gray-800 border-gray-700 text-white text-center focus:border-lime-500 focus:ring-lime-500/20"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(quantity + 10)}
                    className="bg-gray-800 border-gray-700 text-gray-300 hover:border-lime-500 hover:text-lime-500"
                  >
                    <i className="fas fa-plus text-xs"></i>
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-800">
              <div className="text-right">
                <div className="text-sm text-gray-400">Total Cost</div>
                <div className="text-2xl font-bold text-lime-500">
                  {(quantity * service.buyerPrice).toFixed(2)} KES
                </div>
              </div>
              <Button
                onClick={() => handleBuyNow(service)}
                className="bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-lime-500/25 transition-all duration-300 transform hover:scale-105"
              >
                <i className="fas fa-rocket mr-2"></i>
                Launch Order
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
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

  // Redirect to landing page if user is not a buyer
  if (user.role !== 'buyer') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-4">You don't have permission to access the buyer dashboard.</p>
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
                Buyer Dashboard
              </h2>
              <p className="text-xs text-gray-400">Welcome, {user?.full_name || user?.name || 'User'}</p>
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
                Buyer Dashboard
              </h2>
                              <p className="text-sm text-gray-300 mt-1">Welcome, {user?.full_name || user?.name || 'User'}</p>
            </div>
          </div>
          
          <nav className="mt-6 p-4 lg:flex lg:flex-col lg:flex-1 lg:justify-between">
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
                setActiveTab("browse");
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 text-left text-sm rounded-xl transition-all duration-200 mt-2 ${
                activeTab === "browse" 
                  ? "bg-gradient-to-r from-lime-500/20 to-lime-600/20 text-lime-400 border border-lime-500/30" 
                  : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-300"
              }`}
            >
              <i className="fas fa-shopping-cart mr-3 text-lg"></i>
              Browse Services
            </button>
            
            <button
              onClick={() => {
                setActiveTab("orders");
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 text-left text-sm rounded-xl transition-all duration-200 mt-2 ${
                activeTab === "orders" 
                  ? "bg-gradient-to-r from-lime-500/20 to-lime-600/20 text-lime-400 border border-lime-500/30" 
                  : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-300"
              }`}
            >
              <i className="fas fa-clipboard-list mr-3 text-lg"></i>
              Orders & Assignments
            </button>
            
            <button
              onClick={() => {
                setActiveTab("verifications");
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 text-left text-sm rounded-xl transition-all duration-200 mt-2 ${
                activeTab === "verifications" 
                  ? "bg-gradient-to-r from-lime-500/20 to-lime-600/20 text-lime-400 border border-lime-500/30" 
                  : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-300"
              }`}
            >
              <i className="fas fa-check-circle mr-3 text-lg"></i>
              Verifications
            </button>
            
            <button
              onClick={logout}
              className="w-full flex items-center px-4 py-3 text-gray-400 hover:bg-gray-800/50 hover:text-gray-300 text-left text-sm rounded-xl transition-all duration-200 mt-2 lg:hidden"
            >
              <i className="fas fa-sign-out-alt mr-3 text-lg"></i>
              Logout
            </button>
            
            {/* Desktop Logout Button */}
            <div className="hidden lg:block mt-auto pt-6 border-t border-gray-800">
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
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
                  <p className="text-gray-300">Monitor your social media growth and order performance</p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-lime-500/30 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-300 text-sm font-medium">Total Orders</p>
                        <p className="text-3xl font-bold text-white">{transactions.length}</p>
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                        <i className="fas fa-shopping-bag text-white text-xl"></i>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-lime-500/30 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-300 text-sm font-medium">Active Orders</p>
                        <p className="text-3xl font-bold text-white">
                          {transactions.filter((t: any) => t.status === 'in_progress').length}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                        <i className="fas fa-clock text-white text-xl"></i>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-lime-500/30 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-300 text-sm font-medium">Completed</p>
                        <p className="text-3xl font-bold text-white">
                          {transactions.filter((t: any) => t.status === 'completed').length}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                        <i className="fas fa-check-circle text-white text-xl"></i>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-lime-500/30 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-300 text-sm font-medium">Total Spent</p>
                        <p className="text-3xl font-bold text-lime-500">
                          {transactions.reduce((sum: number, t: any) => sum + (t.total_cost || 0), 0).toFixed(2)} KES
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-br from-lime-500 to-lime-600 rounded-xl flex items-center justify-center">
                        <i className="fas fa-coins text-white text-xl"></i>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
                  {transactions.length === 0 ? (
                    <div className="text-center py-8">
                      <i className="fas fa-chart-line text-4xl text-gray-500 mb-4"></i>
                      <p className="text-gray-300 text-lg">No orders yet. Start by browsing our services!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {transactions.slice(0, 5).map((transaction: any) => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-xl border border-gray-600">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-lime-500 to-lime-600 rounded-lg flex items-center justify-center">
                              <i className="fas fa-shopping-cart text-white"></i>
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
                              {transaction.total_cost} KES
                            </p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              transaction.status === 'completed' 
                                ? 'bg-green-500/20 text-green-400' 
                                : transaction.status === 'in_progress'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-gray-500/20 text-gray-300'
                            }`}>
                              {transaction.status}
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

          {activeTab === "browse" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Browse Services</h1>
                <p className="text-gray-300">Choose from our premium social media engagement services</p>
              </div>

              {/* Filters */}
              <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 mb-8">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Platform</label>
                      <Select value={filters.platform} onValueChange={(value) => setFilters(prev => ({ ...prev, platform: value }))}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white focus:border-lime-500 focus:ring-lime-500/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                          <SelectItem value="all" className="text-white hover:bg-gray-700 focus:bg-gray-700">All Platforms</SelectItem>
                          <SelectItem value="instagram" className="text-white hover:bg-gray-700 focus:bg-gray-700">Instagram</SelectItem>
                          <SelectItem value="youtube" className="text-white hover:bg-gray-700 focus:bg-gray-700">YouTube</SelectItem>
                          <SelectItem value="twitter" className="text-white hover:bg-gray-700 focus:bg-gray-700">Twitter</SelectItem>
                          <SelectItem value="tiktok" className="text-white hover:bg-gray-700 focus:bg-gray-700">TikTok</SelectItem>
                          <SelectItem value="facebook" className="text-white hover:bg-gray-700 focus:bg-gray-700">Facebook</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Service Type</label>
                      <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white focus:border-lime-500 focus:ring-lime-500/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                          <SelectItem value="all" className="text-white hover:bg-gray-700 focus:bg-gray-700">All Types</SelectItem>
                          <SelectItem value="followers" className="text-white hover:bg-gray-700 focus:bg-gray-700">Followers</SelectItem>
                          <SelectItem value="likes" className="text-white hover:bg-gray-700 focus:bg-gray-700">Likes</SelectItem>
                          <SelectItem value="views" className="text-white hover:bg-gray-700 focus:bg-gray-700">Views</SelectItem>
                          <SelectItem value="comments" className="text-white hover:bg-gray-700 focus:bg-gray-700">Comments</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Services Grid */}
              {servicesLoading ? (
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
                  {filteredServices.map((service: any) => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "verifications" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Verifications</h1>
                <p className="text-gray-300">Review and verify proof submissions from providers</p>
              </div>
              
              <PendingVerifications />
            </>
          )}

          {activeTab === "orders" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Orders & Assignments</h1>
                <p className="text-gray-300">Track your orders and view assignment progress</p>
              </div>

              {/* Sub-tabs */}
              <div className="flex space-x-1 mb-6 bg-gray-700/50 p-1 rounded-xl">
                <button
                  onClick={() => setOrdersSubTab("transactions")}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                    ordersSubTab === "transactions"
                      ? "bg-lime-500 text-white shadow-lg"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  <i className="fas fa-shopping-cart mr-2"></i>
                  Transactions
                </button>
                <button
                  onClick={() => setOrdersSubTab("assignments")}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                    ordersSubTab === "assignments"
                      ? "bg-lime-500 text-white shadow-lg"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  <i className="fas fa-tasks mr-2"></i>
                  Assignments
                </button>
              </div>

              {ordersSubTab === "transactions" && (
                <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Order History</h3>
                    {transactions.length === 0 ? (
                      <div className="text-center py-8">
                        <i className="fas fa-shopping-cart text-4xl text-gray-500 mb-4"></i>
                        <p className="text-gray-300">No orders yet. Start by browsing our services!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {transactions.map((transaction: any) => (
                          <div key={transaction.id} className="p-4 bg-gray-700/50 rounded-xl border border-gray-600 hover:border-lime-500/30 transition-all duration-300">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-lime-500 to-lime-600 rounded-lg flex items-center justify-center">
                                  <i className="fas fa-shopping-cart text-white"></i>
                                </div>
                                <div>
                                  <p className="text-white font-medium capitalize">
                                    {transaction.platform} {transaction.action_type}
                                  </p>
                                  <p className="text-gray-300 text-sm">
                                    Order #{transaction.id} • {new Date(transaction.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lime-500 font-semibold text-lg">
                                  {transaction.total_cost} KES
                                </p>
                                <span className={`text-xs px-3 py-1 rounded-full ${
                                  transaction.status === 'completed' 
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                    : transaction.status === 'in_progress'
                                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                }`}>
                                  {transaction.status}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-300">
                              <span>Quantity: {transaction.quantity}</span>
                              <span>Fulfilled: {transaction.fulfilled_quantity || 0}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {ordersSubTab === "assignments" && (
                <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Provider Submissions</h3>
                    {submissions.length === 0 ? (
                      <div className="text-center py-8">
                        <i className="fas fa-clipboard-check text-4xl text-gray-500 mb-4"></i>
                        <p className="text-gray-300 text-lg">No completed submissions yet. Providers will submit completed work here for your verification!</p>
                        <p className="text-gray-400 text-sm mt-2">Once providers complete your orders, you'll see their submissions here for approval.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {submissions.map((submission: any) => (
                          <div key={submission.id} className="p-4 bg-gray-700/50 rounded-xl border border-gray-600 hover:border-lime-500/30 transition-all duration-300">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                  <i className="fas fa-user text-white"></i>
                                </div>
                                <div>
                                  <p className="text-white font-medium">
                                    Submission #{submission.id}
                                  </p>
                                  <p className="text-gray-300 text-sm">
                                    {new Date(submission.submitted_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`text-xs px-3 py-1 rounded-full ${
                                  submission.status === 'completed' 
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                    : submission.status === 'in_progress'
                                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                }`}>
                                  {submission.status}
                                </span>
                              </div>
                            </div>
                            <div className="text-sm text-gray-300">
                              <p>Platform: {submission.platform}</p>
                              <p>Action: {submission.action_type}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {checkoutModal.open && checkoutModal.service && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Complete Purchase</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCheckoutModal({ ...checkoutModal, open: false })}
                className="text-gray-400 hover:text-white"
              >
                <i className="fas fa-times"></i>
              </Button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                <i className={`${platformIcons[checkoutModal.service.platform]} text-2xl mr-4`}></i>
                <div className="flex-1">
                  <h3 className="font-medium capitalize text-white">
                    {checkoutModal.service.platform} {checkoutModal.service.type}
                  </h3>
                  <p className="text-sm text-gray-400">Quantity: {checkoutModal.quantity}</p>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-lime-500 text-lg">
                    {(checkoutModal.quantity * checkoutModal.service.buyerPrice).toFixed(2)} KES
                  </div>
                </div>
              </div>

              {checkoutModal.targetUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Target URL</label>
                  <p className="text-sm text-gray-400 break-all bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                    {checkoutModal.targetUrl}
                  </p>
                </div>
              )}

              {checkoutModal.commentText && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Comment</label>
                  <p className="text-sm text-gray-400 bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                    {checkoutModal.commentText}
                  </p>
                </div>
              )}

              <div className="border-t border-gray-800 pt-6">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg font-semibold text-white">Total:</span>
                  <span className="text-2xl font-bold text-lime-500">
                    {(checkoutModal.quantity * checkoutModal.service.buyerPrice).toFixed(2)} KES
                  </span>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handlePurchase}
                    className="w-full bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-lime-500/25 transition-all duration-300"
                  >
                    <i className="fas fa-rocket mr-2"></i>
                    Complete Purchase
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setCheckoutModal({ ...checkoutModal, open: false })}
                    className="w-full border-gray-700 bg-gray-800 text-white hover:border-lime-500 hover:text-lime-500 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      <ReportModal
        open={reportModal.open}
        onOpenChange={(open) => setReportModal(prev => ({ ...prev, open }))}
        targetType={reportModal.targetType}
        targetId={reportModal.targetId}
        targetName={reportModal.targetName}
      />

      {/* Payment Modal */}
      <PaymentModal
        open={paymentModal.open}
        onOpenChange={(open) => setPaymentModal(prev => ({ ...prev, open }))}
        service={paymentModal.service}
        quantity={paymentModal.quantity}
        totalCost={paymentModal.totalCost}
        targetUrl={paymentModal.targetUrl}
        commentText={paymentModal.commentText}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
