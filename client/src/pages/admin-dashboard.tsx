import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth.tsx";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("analytics");

  // Redirect if not admin
  if (user?.role !== 'admin') {
    setLocation('/');
    return null;
  }

  const { data: stats } = useQuery({
    queryKey: ['/api/admin/stats'],
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['/api/transactions'],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-6">
            <h2 className="text-xl font-bold text-primary">Admin Dashboard</h2>
            <p className="text-sm text-gray-600 mt-1">Welcome, {user?.name}</p>
          </div>
          
          <nav className="mt-6">
            <button
              onClick={() => setActiveTab("analytics")}
              className={`w-full flex items-center px-6 py-3 text-left ${
                activeTab === "analytics" 
                  ? "text-gray-700 bg-gray-100 border-r-2 border-primary" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <i className="fas fa-chart-bar mr-3"></i>
              Analytics
            </button>
            
            <button
              onClick={() => setActiveTab("users")}
              className={`w-full flex items-center px-6 py-3 text-left ${
                activeTab === "users" 
                  ? "text-gray-700 bg-gray-100 border-r-2 border-primary" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <i className="fas fa-users mr-3"></i>
              User Management
            </button>
            
            <button
              onClick={() => setActiveTab("transactions")}
              className={`w-full flex items-center px-6 py-3 text-left ${
                activeTab === "transactions" 
                  ? "text-gray-700 bg-gray-100 border-r-2 border-primary" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <i className="fas fa-credit-card mr-3"></i>
              Transactions
            </button>
            
            <button
              onClick={() => setActiveTab("moderation")}
              className={`w-full flex items-center px-6 py-3 text-left ${
                activeTab === "moderation" 
                  ? "text-gray-700 bg-gray-100 border-r-2 border-primary" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <i className="fas fa-shield-alt mr-3"></i>
              Moderation
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
          {activeTab === "analytics" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Platform Analytics</h1>
                <p className="text-gray-600">Monitor platform performance and key metrics</p>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <i className="fas fa-users text-primary text-xl"></i>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Users</p>
                        <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <i className="fas fa-chart-line text-green-600 text-xl"></i>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Revenue</p>
                        <p className="text-2xl font-bold text-gray-900">{stats?.totalRevenue?.toFixed(2) || 0} Shillings</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <i className="fas fa-exchange-alt text-yellow-600 text-xl"></i>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Transactions</p>
                        <p className="text-2xl font-bold text-gray-900">{stats?.totalTransactions || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <i className="fas fa-tasks text-purple-500 text-xl"></i>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                        <p className="text-2xl font-bold text-gray-900">{stats?.completionRate?.toFixed(1) || 0}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {activeTab === "transactions" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Transaction Management</h1>
                <p className="text-gray-600">Monitor all platform transactions</p>
              </div>

              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-6">Recent Transactions</h2>
                
                {transactions.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No transactions yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Transaction ID</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Buyer</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Service</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.slice(0, 10).map((transaction: any) => (
                          <tr key={transaction.id} className="border-b border-gray-100">
                            <td className="py-3 px-4 font-mono text-sm">#{transaction.id}</td>
                            <td className="py-3 px-4">{transaction.buyer?.email || 'N/A'}</td>
                            <td className="py-3 px-4 capitalize">
                              {transaction.service?.platform} {transaction.service?.type}
                            </td>
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

          {activeTab === "users" && (
            <>
              <div className="mb-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
                    <p className="text-gray-600">Manage platform users and their access</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Select>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="All Users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="buyer">Buyers</SelectItem>
                        <SelectItem value="provider">Providers</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Search users..." className="w-64" />
                  </div>
                </div>
              </div>

              <Card className="p-6">
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-users text-4xl mb-4"></i>
                  <p>User management features will be implemented here</p>
                  <p className="text-sm">Include user listing, suspension, and role management</p>
                </div>
              </Card>
            </>
          )}

          {activeTab === "moderation" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Moderation</h1>
                <p className="text-gray-600">Review and moderate user-generated content</p>
              </div>

              <Card className="p-6">
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-shield-alt text-4xl mb-4"></i>
                  <p>Content moderation features will be implemented here</p>
                  <p className="text-sm">Include comment review, service approval, and content filtering</p>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
