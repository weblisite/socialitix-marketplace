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

export default function BuyerDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [ordersSubTab, setOrdersSubTab] = useState("transactions");
  const [filters, setFilters] = useState({ platform: "all", type: "all" });
  // State for checkout modal
  const [checkoutModal, setCheckoutModal] = useState({
    open: false,
    service: null as any,
    quantity: 20, // Changed from 1 to 20
    commentText: '',
    targetUrl: ''
  });

  // State for payment modal
  const [paymentModal, setPaymentModal] = useState({
    open: false,
    service: null as any,
    quantity: 20, // Changed from 1 to 20
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

  // Fetch services from API instead of using predefined services
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

  // Debug: Log services data
  console.log("Services data:", services);
  console.log("Services loading:", servicesLoading);

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

  // Debug: Log filtered services
  console.log("Filtered services:", filteredServices);
  console.log("Current filters:", filters);

  // Handle Buy Now
  const handleBuyNow = (service: any) => {
    setCheckoutModal({ 
      open: true, 
      service, 
      quantity: 20, // Changed from 1 to 20
      commentText: '', 
      targetUrl: '' 
    });
  };

  // Handle purchase completion - now opens payment modal
  const handlePurchase = () => {
    if (!checkoutModal.service) return;
    
    const totalCost = checkoutModal.quantity * checkoutModal.service.buyerPrice;
    
    // Open payment modal instead of creating transaction directly
    setPaymentModal({
      open: true,
      service: checkoutModal.service,
      quantity: checkoutModal.quantity,
      totalCost: totalCost,
      targetUrl: checkoutModal.targetUrl,
      commentText: checkoutModal.commentText
    });
    
    // Close checkout modal
    setCheckoutModal({ open: false, service: null, quantity: 20, commentText: '', targetUrl: '' }); // Changed from 1 to 20
  };

  // Handle payment success
  const handlePaymentSuccess = () => {
    // Refresh transactions
    queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    
    toast({
      title: "Order placed successfully!",
      description: "Your order has been submitted and will be processed shortly.",
    });
  };

  // Fetch assignments for completed orders
  const { data: assignments = [] } = useQuery({
    queryKey: ['/api/buyer/assignments'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/buyer/assignments');
      return response.json();
    },
  });

  // Redirect if not buyer - only redirect if we have user data and they're not a buyer
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
    const [quantity, setQuantity] = useState(20); // Changed from 1 to 20
    const [commentText, setCommentText] = useState("");
    const [targetUrl, setTargetUrl] = useState("");

    const handleQuantityChange = (value: number | string) => {
      const numValue = typeof value === 'string' ? parseInt(value) : value;
      setQuantity(Math.max(20, Math.min(10000, numValue))); // Changed from 1 to 20
    };

    const handleCustomQuantityChange = (value: string) => {
      const numValue = parseInt(value) || 20; // Changed from 1 to 20
      setQuantity(Math.max(20, Math.min(10000, numValue))); // Changed from 1 to 20
    };

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <i className={`${platformIcons[service.platform]} text-2xl mr-3`}></i>
              <div>
                <h3 className="text-lg font-semibold capitalize">
                  {service.platform} {service.type}
                </h3>
                <p className="text-gray-600">{service.buyerDescription}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {service.buyerPrice} KES
              </div>
              <div className="text-sm text-gray-500">
                per {service.type.slice(0, -1)}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity (Minimum: 20)
              </label>
              
              {/* Quantity Presets */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[20, 100, 500, 1000].map((preset) => ( // Changed first preset from 100 to 20
                  <Button
                    key={preset}
                    variant={quantity === preset ? "default" : "outline"}
                    size="sm"
                    onClick={() => setQuantity(preset)}
                    className="text-xs"
                  >
                    {preset.toLocaleString()}
                  </Button>
                ))}
              </div>
              
              {/* Additional Quantity Presets */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[2500, 5000, 10000, 25000].map((preset) => (
                  <Button
                    key={preset}
                    variant={quantity === preset ? "default" : "outline"}
                    size="sm"
                    onClick={() => setQuantity(preset)}
                    className="text-xs"
                  >
                    {preset.toLocaleString()}
                  </Button>
                ))}
          </div>
          
              {/* Manual Quantity Selector */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 20} // Changed from 1 to 20
                >
                  -
                </Button>
            <Input
              type="number"
              value={quantity}
                  onChange={(e) => handleCustomQuantityChange(e.target.value)}
                  className="w-20 text-center"
                  min="20" // Changed from 1 to 20
                  max="10000"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= 10000}
                >
                  +
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target URL (Required)
              </label>
            <Input
                type="url"
                placeholder="https://instagram.com/your-account"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
                required
            />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment (Optional)
              </label>
              <Textarea
                placeholder="Any specific instructions or comments..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
              />
            </div>
            
            <div className="flex space-x-2">
            <Button
                onClick={() => handleBuyNow({
                  ...service,
                  quantity,
                  commentText,
                  targetUrl
                })}
                disabled={!targetUrl}
                className="flex-1 bg-primary hover:bg-primary-dark"
              >
                Buy Now - {(quantity * service.buyerPrice).toFixed(2)} KES
            </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-6">
            <h2 className="text-xl font-bold text-primary">Buyer Dashboard</h2>
            <p className="text-sm text-gray-600 mt-1">Welcome, {user?.name}</p>
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
              onClick={() => setActiveTab("browse")}
              className={`w-full flex items-center px-6 py-3 text-left ${
                activeTab === "browse" 
                  ? "text-gray-700 bg-gray-100 border-r-2 border-primary" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <i className="fas fa-shopping-cart mr-3"></i>
              Browse Services
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
              Orders & Assignments
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
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Buyer Overview</h1>
                <p className="text-gray-600">Welcome back! Here's your marketplace summary</p>
              </div>

              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <i className="fas fa-shopping-cart text-blue-600 text-xl"></i>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Cart Items</p>
                        <p className="text-2xl font-bold">{checkoutModal.service ? 1 : 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <i className="fas fa-credit-card text-green-600 text-xl"></i>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Spent</p>
                        <p className="text-2xl font-bold">{checkoutModal.service ? (checkoutModal.quantity * checkoutModal.service.buyerPrice).toFixed(2) : '0.00'} KES</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <i className="fas fa-history text-purple-600 text-xl"></i>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Orders</p>
                        <p className="text-2xl font-bold">{transactions.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                {transactions.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                ) : (
                  <div className="space-y-3">
                    {transactions.slice(0, 5).map((transaction: any) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <i className={`${platformIcons[transaction.service?.platform || 'instagram']} text-lg mr-3`}></i>
                          <div>
                            <p className="font-medium capitalize">
                              {transaction.service?.platform} {transaction.service?.type}
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{transaction.totalCost} KES</p>
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
                )}
              </Card>
            </>
          )}

          {activeTab === "browse" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Services</h1>
                <p className="text-gray-600">Select and purchase social media engagement services</p>
              </div>

              {/* Filters */}
              <div className="mb-6 flex flex-wrap gap-4">
                <Select value={filters.platform} onValueChange={(value) => setFilters(prev => ({ ...prev, platform: value }))}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Platform" />
                      </SelectTrigger>
                      <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="twitter">Twitter</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                      </SelectContent>
                    </Select>

                <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="followers">Followers</SelectItem>
                        <SelectItem value="likes">Likes</SelectItem>
                        <SelectItem value="views">Views</SelectItem>
                        <SelectItem value="comments">Comments</SelectItem>
                    <SelectItem value="subscribers">Subscribers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

              {/* Services Grid */}
              {servicesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded mb-4"></div>
                        <div className="h-8 bg-gray-200 rounded"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="text-center py-12">
                  <i className="fas fa-search text-4xl text-gray-400 mb-4"></i>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
                  <p className="text-gray-600 mb-4">
                    {services.length === 0 
                      ? "No services are currently available. Please check back later."
                      : "No services match your current filters. Try adjusting your search criteria."
                    }
                  </p>
                  {services.length === 0 && (
                    <div className="text-sm text-gray-500">
                      <p>Debug info:</p>
                      <p>Services loaded: {services.length}</p>
                      <p>Services loading: {servicesLoading ? 'Yes' : 'No'}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredServices.map((service: any) => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "orders" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Orders & Assignments</h1>
                <p className="text-gray-600">View your orders, who provided the services, and verification proof</p>
              </div>

              {/* Tabs for Orders and Assignments */}
              <div className="mb-6">
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setOrdersSubTab("transactions")}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        ordersSubTab === "transactions"
                          ? "border-primary text-primary"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <i className="fas fa-receipt mr-2"></i>
                      Order Summary
                    </button>
                    <button
                      onClick={() => setOrdersSubTab("assignments")}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        ordersSubTab === "assignments"
                          ? "border-primary text-primary"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <i className="fas fa-tasks mr-2"></i>
                      Individual Assignments
                    </button>
                  </nav>
                </div>
              </div>

              {/* Order Summary Tab */}
              {ordersSubTab === "transactions" && (
              <Card className="p-6">
                {transactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <i className="fas fa-receipt text-4xl mb-4"></i>
                      <p>No orders yet</p>
                      <p className="text-sm mt-2">Start by browsing services and making your first purchase</p>
                    </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Service</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Quantity</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Total Cost</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((transaction: any) => (
                          <tr key={transaction.id} className="border-b border-gray-100">
                            <td className="py-3 px-4 capitalize">
                              {transaction.service?.platform} {transaction.service?.type}
                            </td>
                            <td className="py-3 px-4">{transaction.quantity}</td>
                              <td className="py-3 px-4 font-semibold">{transaction.totalCost} KES</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                transaction.status === 'completed' 
                                  ? 'bg-green-100 text-green-800'
                                  : transaction.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {transaction.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </td>
                              <td className="py-3 px-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setOrdersSubTab("assignments")}
                                  className="text-primary hover:text-primary-dark"
                                >
                                  <i className="fas fa-eye mr-1"></i>
                                  View Details
                                </Button>
                              </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
              )}

              {/* Individual Assignments Tab */}
              {ordersSubTab === "assignments" && (
                <>
                  {assignments.length === 0 ? (
                    <Card className="p-6">
                      <div className="text-center py-8 text-gray-500">
                        <i className="fas fa-clipboard-list text-4xl mb-4"></i>
                        <p>No assignments yet</p>
                        <p className="text-sm mt-2">You'll see individual assignments here when your orders are processed</p>
                      </div>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      {assignments.map((assignment: any) => (
                        <Card key={assignment.id} className="overflow-hidden">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center">
                                <i className={`${platformIcons[assignment.platform || 'instagram']} text-xl mr-3`}></i>
                                <div>
                                  <h3 className="text-lg font-semibold capitalize">
                                    {assignment.platform} {assignment.actionType}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    Assignment #{assignment.id} • {new Date(assignment.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  assignment.status === 'completed' 
                                    ? 'bg-green-100 text-green-800'
                                    : assignment.status === 'in_progress'
                                    ? 'bg-blue-100 text-blue-800'
                                    : assignment.status === 'assigned'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {assignment.status.replace('_', ' ')}
                                </span>
                                {assignment.status === 'completed' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setReportModal({ 
                                      open: true, 
                                      targetType: 'assignment', 
                                      targetId: assignment.id, 
                                      targetName: `Assignment #${assignment.id} - ${assignment.platform} ${assignment.actionType}` 
                                    })}
                                    className="text-red-600 hover:text-red-700"
                                    title="Report this assignment"
                                  >
                                    <i className="fas fa-flag"></i>
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Order Details</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Target URL:</span>
                                    <span className="font-medium truncate max-w-xs">{assignment.targetUrl}</span>
                                  </div>
                                  {assignment.commentText && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Comment:</span>
                                      <span className="font-medium">{assignment.commentText}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Quantity:</span>
                                    <span className="font-medium">1 action</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Provider Information</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Provider ID:</span>
                                    <span className="font-medium">#{assignment.providerId}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Provider Rating:</span>
                                    <div className="flex items-center">
                                      <div className="flex text-yellow-400 mr-1">
                                        {[...Array(5)].map((_, i) => (
                                          <i key={i} className="fas fa-star text-xs"></i>
                                        ))}
                                      </div>
                                      <span className="text-xs">(4.8)</span>
                                    </div>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Completed Actions:</span>
                                    <span className="font-medium">1,247</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Verification Screenshots */}
                            {assignment.status === 'completed' && assignment.verificationScreenshots && (
                              <div className="border-t pt-4">
                                <h4 className="font-medium text-gray-900 mb-3">Verification Proof</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {assignment.verificationScreenshots.map((screenshot: any, index: number) => (
                                    <div key={index} className="relative group">
                                      <img 
                                        src={screenshot.url} 
                                        alt={`Verification ${index + 1}`}
                                        className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => window.open(screenshot.url, '_blank')}
                                      />
                                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                                        <i className="fas fa-expand text-white opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                      </div>
                                      <p className="text-xs text-gray-600 mt-1 text-center">
                                        {screenshot.description || `Screenshot ${index + 1}`}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            {assignment.status === 'assigned' && (
                              <div className="border-t pt-4 mt-4">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm text-gray-600">
                                    <i className="fas fa-clock mr-1"></i>
                                    Provider is working on your order
                                  </div>
                                  <Button variant="outline" size="sm">
                                    <i className="fas fa-question-circle mr-2"></i>
                                    Need Help?
                                  </Button>
                                </div>
                              </div>
                            )}

                            {assignment.status === 'completed' && (
                              <div className="border-t pt-4 mt-4">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm text-green-600">
                                    <i className="fas fa-check-circle mr-1"></i>
                                    Service completed successfully
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button variant="outline" size="sm">
                                      <i className="fas fa-thumbs-up mr-2"></i>
                                      Rate Provider
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setReportModal({ 
                                        open: true, 
                                        targetType: 'assignment', 
                                        targetId: assignment.id, 
                                        targetName: `Assignment #${assignment.id} - ${assignment.platform} ${assignment.actionType}` 
                                      })}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <i className="fas fa-flag mr-2"></i>
                                      Report Issue
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {checkoutModal.open && checkoutModal.service && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Complete Purchase</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCheckoutModal({ ...checkoutModal, open: false })}
              >
                <i className="fas fa-times"></i>
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <i className={`${platformIcons[checkoutModal.service.platform]} text-xl mr-3`}></i>
                <div>
                  <h3 className="font-medium capitalize">
                    {checkoutModal.service.platform} {checkoutModal.service.type}
                  </h3>
                  <p className="text-sm text-gray-600">Quantity: {checkoutModal.quantity}</p>
                </div>
                <div className="ml-auto text-right">
                  <div className="font-semibold">
                    {(checkoutModal.quantity * checkoutModal.service.buyerPrice).toFixed(2)} KES
                  </div>
                </div>
              </div>

              {checkoutModal.targetUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target URL</label>
                  <p className="text-sm text-gray-600 break-all">{checkoutModal.targetUrl}</p>
                </div>
              )}

              {checkoutModal.commentText && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                  <p className="text-sm text-gray-600">{checkoutModal.commentText}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-xl font-bold text-primary">
                    {(checkoutModal.quantity * checkoutModal.service.buyerPrice).toFixed(2)} KES
                  </span>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={handlePurchase}
                    className="w-full bg-primary hover:bg-primary-dark"
                  >
                    <span>Complete Purchase</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setCheckoutModal({ ...checkoutModal, open: false })}
                    className="w-full"
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
