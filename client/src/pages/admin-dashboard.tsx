import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth.tsx";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch admin data
  const { data: stats = {} } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const response = await fetch('/api/admin/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch admin stats');
      }
      return response.json();
    },
  });

  // Redirect if not admin
  if (user && user.role !== 'admin') {
    setLocation('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900/80 backdrop-blur-lg border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-lime-500 to-lime-400 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white">Welcome, {user?.name}</span>
              <Button
                variant="outline"
                onClick={logout}
                className="border-gray-700 bg-gray-800 text-white hover:border-lime-500 hover:text-lime-500 hover:bg-gray-700"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Platform Overview</h2>
          <p className="text-gray-400">Monitor and manage the social media engagement marketplace</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-black/80 border-gray-800 hover:border-lime-500/30 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 font-medium text-sm">Total Users</p>
                  <p className="text-3xl font-bold text-white">{stats.totalUsers || 0}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <i className="fas fa-users text-white text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/80 border-gray-800 hover:border-lime-500/30 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 font-medium text-sm">Total Transactions</p>
                  <p className="text-3xl font-bold text-white">{stats.totalTransactions || 0}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <i className="fas fa-exchange-alt text-white text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/80 border-gray-800 hover:border-lime-500/30 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 font-medium text-sm">Platform Revenue</p>
                  <p className="text-3xl font-bold text-lime-500">{stats.platformRevenue || 0} KES</p>
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
                  <p className="text-gray-300 font-medium text-sm">Active Assignments</p>
                  <p className="text-3xl font-bold text-yellow-500">{stats.activeAssignments || 0}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                  <i className="fas fa-tasks text-white text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Trends */}
        <Card className="bg-black/80 border-gray-800 mb-8">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Revenue Trends</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-900/80 rounded-xl border border-gray-700">
                <p className="text-gray-400 text-sm">Today</p>
                <p className="text-2xl font-bold text-lime-500">{stats.todayRevenue || 0} KES</p>
              </div>
              <div className="text-center p-4 bg-gray-900/80 rounded-xl border border-gray-700">
                <p className="text-gray-400 text-sm">This Week</p>
                <p className="text-2xl font-bold text-blue-500">{stats.weekRevenue || 0} KES</p>
              </div>
              <div className="text-center p-4 bg-gray-900/80 rounded-xl border border-gray-700">
                <p className="text-gray-400 text-sm">This Month</p>
                <p className="text-2xl font-bold text-green-500">{stats.monthRevenue || 0} KES</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-800">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4">User Distribution</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <i className="fas fa-shopping-cart text-white text-sm"></i>
                    </div>
                    <span className="text-white font-medium">Buyers</span>
                  </div>
                  <span className="text-lime-500 font-bold">{stats.buyers || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <i className="fas fa-user-cog text-white text-sm"></i>
                    </div>
                    <span className="text-white font-medium">Providers</span>
                  </div>
                  <span className="text-lime-500 font-bold">{stats.providers || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <i className="fas fa-shield-alt text-white text-sm"></i>
                    </div>
                    <span className="text-white font-medium">Admins</span>
                  </div>
                  <span className="text-lime-500 font-bold">{stats.admins || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-800">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Platform Statistics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                      <i className="fas fa-clock text-white text-sm"></i>
                    </div>
                    <span className="text-white font-medium">Pending Verifications</span>
                  </div>
                  <span className="text-yellow-500 font-bold">{stats.pendingVerifications || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <i className="fas fa-check-circle text-white text-sm"></i>
                    </div>
                    <span className="text-white font-medium">Completed Tasks</span>
                  </div>
                  <span className="text-green-500 font-bold">{stats.completedTasks || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                      <i className="fas fa-exclamation-triangle text-white text-sm"></i>
                    </div>
                    <span className="text-white font-medium">Failed Tasks</span>
                  </div>
                  <span className="text-red-500 font-bold">{stats.failedTasks || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-800 mt-8">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="border-gray-700 text-gray-300 hover:border-lime-500 hover:text-lime-500 h-12"
              >
                <i className="fas fa-users mr-2"></i>
                Manage Users
              </Button>
              <Button
                variant="outline"
                className="border-gray-700 text-gray-300 hover:border-lime-500 hover:text-lime-500 h-12"
              >
                <i className="fas fa-tasks mr-2"></i>
                Review Assignments
              </Button>
              <Button
                variant="outline"
                className="border-gray-700 text-gray-300 hover:border-lime-500 hover:text-lime-500 h-12"
              >
                <i className="fas fa-chart-bar mr-2"></i>
                View Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
