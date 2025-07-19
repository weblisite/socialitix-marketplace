import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth.tsx";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { loadPaystackScript, initializePayment } from "@/lib/paystack";

export default function BuyerDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("browse");
  const [filters, setFilters] = useState({ platform: "", type: "" });

  // Redirect if not buyer
  if (user?.role !== 'buyer') {
    setLocation('/');
    return null;
  }

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/services', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.platform) params.append('platform', filters.platform);
      if (filters.type) params.append('type', filters.type);
      
      const res = await fetch(`/api/services?${params}`);
      if (!res.ok) throw new Error('Failed to fetch services');
      return res.json();
    },
  });

  const { data: cartItems = [] } = useQuery({
    queryKey: ['/api/cart'],
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['/api/transactions'],
  });

  const addToCartMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/cart', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({ title: "Success", description: "Item added to cart" });
    },
  });

  const removeFromCartMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/cart/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({ title: "Success", description: "Item removed from cart" });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (transactionData: any) => {
      const res = await apiRequest('POST', '/api/transactions', transactionData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({ title: "Success", description: "Purchase completed!" });
    },
  });

  const handleAddToCart = (serviceId: number, quantity: number, commentText?: string, targetUrl?: string) => {
    addToCartMutation.mutate({
      serviceId,
      quantity,
      commentText,
      targetUrl,
    });
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum: number, item: any) => sum + (item.quantity * 5), 0);
  };

  const handleCheckout = async () => {
    try {
      if (cartItems.length === 0) {
        toast({ title: "Cart is empty", description: "Add items to cart before checkout", variant: "destructive" });
        return;
      }

      const totalAmount = calculateTotal();
      
      // Initialize payment with backend
      const initResponse = await apiRequest('POST', '/api/payments/initialize', {
        cartItems,
        totalAmount,
        targetUrl: "https://example.com"
      });
      const paymentData = await initResponse.json();
      
      // Load Paystack script and process payment
      await loadPaystackScript();
      
      initializePayment({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_d74e915c07ff292b5e7d75d8c0ee8061fb0cc6d8',
        email: user!.email,
        amount: paymentData.amount,
        reference: paymentData.reference,
        metadata: {
          transactionId: paymentData.transactionId,
          cartItems: JSON.stringify(cartItems)
        },
        callback: async (response) => {
          try {
            // Verify payment with backend
            await apiRequest('POST', '/api/payments/verify', {
              reference: response.reference,
              transactionId: paymentData.transactionId
            });
            
            queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
            queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
            toast({ title: "Payment successful!", description: "Your order has been placed." });
            setActiveTab('history');
          } catch (error) {
            toast({ title: "Payment verification failed", description: "Please contact support", variant: "destructive" });
          }
        },
        onClose: () => {
          toast({ title: "Payment cancelled", description: "You can try again anytime" });
        },
      });
    } catch (error) {
      console.error('Checkout error:', error);
      toast({ title: "Checkout failed", description: "Please try again", variant: "destructive" });
    }
  };

  const platformIcons: Record<string, string> = {
    instagram: "fab fa-instagram text-pink-500",
    youtube: "fab fa-youtube text-red-500",
    twitter: "fab fa-twitter text-blue-500",
    tiktok: "fab fa-tiktok text-black",
  };

  const ServiceCard = ({ service }: { service: any }) => {
    const [quantity, setQuantity] = useState(1);
    const [commentText, setCommentText] = useState("");
    const [targetUrl, setTargetUrl] = useState("");

    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <i className={`${platformIcons[service.platform]} text-xl mr-2`}></i>
              <span className="text-sm font-medium text-gray-600 capitalize">{service.platform}</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">5 Shillings</div>
              <div className="text-xs text-gray-500">per action</div>
            </div>
          </div>
          
          <h3 className="text-lg font-semibold mb-2 capitalize">
            {service.platform} {service.type}
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            {service.description || `Get authentic ${service.type} for your ${service.platform} account`}
          </p>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <i key={i} className="fas fa-star text-xs"></i>
                ))}
              </div>
              <span className="text-sm text-gray-600 ml-2">({Number(service.rating).toFixed(1)})</span>
            </div>
            <span className="text-sm text-gray-600">{service.totalOrders} orders</span>
          </div>
          
          <div className="space-y-2">
            <Input
              type="number"
              placeholder="Quantity"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />
            
            <Input
              placeholder="Target URL (required)"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
            />
            
            {service.type === 'comments' && (
              <Textarea
                placeholder="Comment text (optional)"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
              />
            )}
            
            <Button
              onClick={() => handleAddToCart(service.id, quantity, commentText, targetUrl)}
              disabled={!targetUrl || addToCartMutation.isPending}
              className="w-full bg-primary hover:bg-primary-dark"
            >
              Add to Cart
            </Button>
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
              onClick={() => setActiveTab("history")}
              className={`w-full flex items-center px-6 py-3 text-left ${
                activeTab === "history" 
                  ? "text-gray-700 bg-gray-100 border-r-2 border-primary" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <i className="fas fa-history mr-3"></i>
              Purchase History
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
          {activeTab === "browse" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Services</h1>
                <p className="text-gray-600">Choose services to boost your social media presence</p>
              </div>

              {/* Filters */}
              <Card className="p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                    <Select value={filters.platform} onValueChange={(value) => setFilters({...filters, platform: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Platforms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Platforms</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="twitter">Twitter</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                    <Select value={filters.type} onValueChange={(value) => setFilters({...filters, type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Services" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Services</SelectItem>
                        <SelectItem value="followers">Followers</SelectItem>
                        <SelectItem value="likes">Likes</SelectItem>
                        <SelectItem value="views">Views</SelectItem>
                        <SelectItem value="comments">Comments</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Best Rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rating">Best Rating</SelectItem>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="popular">Most Popular</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* Services Grid */}
              {servicesLoading ? (
                <div className="text-center py-8">Loading services...</div>
              ) : services.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No services available</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {services.map((service: any) => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </div>
              )}

              {/* Shopping Cart */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Shopping Cart</h2>
                
                {cartItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Your cart is empty</p>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      {cartItems.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <i className={`${platformIcons[item.service?.platform || 'instagram']} text-xl mr-3`}></i>
                            <div>
                              <h4 className="font-medium capitalize">
                                {item.service?.platform} {item.service?.type}
                              </h4>
                              <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                              {item.targetUrl && (
                                <p className="text-xs text-gray-500">Target: {item.targetUrl}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{item.quantity * 5} Shillings</div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeFromCartMutation.mutate(item.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-semibold">Total:</span>
                        <span className="text-xl font-bold text-primary">{calculateTotal()} Shillings</span>
                      </div>
                      <Button 
                        onClick={handleCheckout}
                        disabled={checkoutMutation.isPending}
                        className="w-full bg-primary hover:bg-primary-dark"
                      >
                        Proceed to Checkout
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            </>
          )}

          {activeTab === "history" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase History</h1>
                <p className="text-gray-600">View your past purchases and their status</p>
              </div>

              <Card className="p-6">
                {transactions.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No purchases yet</p>
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
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((transaction: any) => (
                          <tr key={transaction.id} className="border-b border-gray-100">
                            <td className="py-3 px-4 capitalize">
                              {transaction.service?.platform} {transaction.service?.type}
                            </td>
                            <td className="py-3 px-4">{transaction.quantity}</td>
                            <td className="py-3 px-4 font-semibold">{transaction.totalCost} Shillings</td>
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
