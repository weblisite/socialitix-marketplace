import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocation, Link } from 'wouter';
import ReportModal from '@/components/report-modal';

export default function EnhancedAdminDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedUser, setSelectedUser] = useState(null);
  const [moderationReason, setModerationReason] = useState('');
  const [moderationDialog, setModerationDialog] = useState({ open: false, item: null, action: '' });
  const [userActionDialog, setUserActionDialog] = useState({ open: false, user: null, action: '' });
  const [reportModal, setReportModal] = useState({ open: false, targetType: 'user' as const, targetId: 0, targetName: '' });

  // Redirect if not admin - only redirect if we have user data and they're not an admin
  if (user && user.role !== 'admin') {
    setLocation('/');
    return null;
  }

  // Data queries
  const { data: users = [] } = useQuery({
    queryKey: ['/api/admin/users'],
  });

  const { data: moderationQueue = [] } = useQuery({
    queryKey: ['/api/admin/moderation-queue'],
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['/api/admin/reports'],
  });

  const { data: platformStats = {} } = useQuery({
    queryKey: ['/api/admin/stats'],
    retry: false,
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return apiRequest(`/api/admin/moderate/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/moderation-queue'] });
      toast({ title: 'Content approved successfully' });
      setModerationDialog({ open: false, item: null, action: '' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return apiRequest(`/api/admin/moderate/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/moderation-queue'] });
      toast({ title: 'Content rejected successfully' });
      setModerationDialog({ open: false, item: null, action: '' });
    },
  });

  const suspendUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: number; reason: string }) => {
      return apiRequest(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'User suspended successfully' });
      setUserActionDialog({ open: false, user: null, action: '' });
    },
  });

  const handleModeration = (item: any, action: 'approve' | 'reject') => {
    setModerationDialog({ open: true, item, action });
  };

  const submitModeration = () => {
    if (!moderationDialog.item || !moderationReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for moderation',
        variant: 'destructive',
      });
      return;
    }

    const mutation = moderationDialog.action === 'approve' ? approveMutation : rejectMutation;
    mutation.mutate({ 
      id: moderationDialog.item.id, 
      reason: moderationReason 
    });
  };

  const handleUserAction = (user: any, action: 'suspend' | 'report') => {
    setUserActionDialog({ open: true, user, action });
  };

  const submitUserAction = () => {
    if (!userActionDialog.user || !moderationReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for this action',
        variant: 'destructive',
      });
      return;
    }

    if (userActionDialog.action === 'suspend') {
      suspendUserMutation.mutate({ 
        userId: userActionDialog.user.id, 
        reason: moderationReason 
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'resolved': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Platform management and moderation</p>
          </div>
          <div className="flex gap-4">
            <Link href="/profile">
              <Button variant="outline">
                <i className="fas fa-user mr-2"></i>
                Profile
              </Button>
            </Link>
            <Button onClick={() => setLocation('/')}>
              <i className="fas fa-home mr-2"></i>
              Home
            </Button>
            <Button onClick={logout} variant="outline">
              <i className="fas fa-sign-out-alt mr-2"></i>
              Logout
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">
              <i className="fas fa-chart-dashboard mr-2"></i>
              Overview
            </TabsTrigger>
            <TabsTrigger value="moderation">
              <i className="fas fa-shield-alt mr-2"></i>
              Moderation
            </TabsTrigger>
            <TabsTrigger value="users">
              <i className="fas fa-users mr-2"></i>
              Users
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <i className="fas fa-credit-card mr-2"></i>
              Transactions
            </TabsTrigger>
            <TabsTrigger value="reports">
              <i className="fas fa-flag mr-2"></i>
              Reports
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <i className="fas fa-analytics mr-2"></i>
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-100">
                      <i className="fas fa-users text-blue-600 text-xl"></i>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold">{users.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-yellow-100">
                      <i className="fas fa-clock text-yellow-600 text-xl"></i>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Pending Moderation</p>
                      <p className="text-2xl font-bold">{moderationQueue.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-red-100">
                      <i className="fas fa-flag text-red-600 text-xl"></i>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Open Reports</p>
                      <p className="text-2xl font-bold">{reports.filter(r => r.status === 'pending').length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-green-100">
                      <i className="fas fa-dollar-sign text-green-600 text-xl"></i>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Platform Revenue</p>
                      <p className="text-2xl font-bold">₽ {(platformStats.revenue || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {moderationQueue.slice(0, 5).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded">
                      <div className="flex items-center space-x-4">
                        <Badge className={getSeverityColor(item.severity)}>
                          {item.severity?.toUpperCase()}
                        </Badge>
                        <div>
                          <p className="font-medium">{item.contentType} Content</p>
                          <p className="text-sm text-gray-600">{item.content.substring(0, 100)}...</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleModeration(item, 'approve')}
                        >
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleModeration(item, 'reject')}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                  {moderationQueue.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No pending moderation items</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Moderation Tab */}
          <TabsContent value="moderation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Moderation Queue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {moderationQueue.map((item: any) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <Badge className={getSeverityColor(item.severity)}>
                            {item.severity?.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {item.contentType}
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <p className="font-medium mb-2">Content:</p>
                        <div className="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                          <p className="text-sm">{item.content}</p>
                        </div>
                      </div>

                      {item.reason && (
                        <div className="mb-4">
                          <p className="font-medium mb-2">Flagged for:</p>
                          <p className="text-sm text-red-600">{item.reason}</p>
                        </div>
                      )}

                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline"
                          onClick={() => handleModeration(item, 'approve')}
                        >
                          <i className="fas fa-check mr-2"></i>
                          Approve
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={() => handleModeration(item, 'reject')}
                        >
                          <i className="fas fa-times mr-2"></i>
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                  {moderationQueue.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <i className="fas fa-check-circle text-4xl mb-4"></i>
                      <p>No items pending moderation</p>
                      <p className="text-sm">All content has been reviewed</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">User</th>
                        <th className="text-left py-3 px-4">Role</th>
                        <th className="text-left py-3 px-4">Balance</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Joined</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user: any) => (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={getStatusColor(user.role)}>
                              {user.role.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {user.role === 'provider' ? `${user.balance || 0} KES` : 'N/A'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className="bg-green-100 text-green-800">
                              ACTIVE
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline">
                                <i className="fas fa-eye mr-2"></i>
                                View
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleUserAction(user, 'suspend')}
                                className="text-red-600 hover:text-red-700"
                              >
                                <i className="fas fa-ban mr-2"></i>
                                Suspend
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setReportModal({ 
                                  open: true, 
                                  targetType: 'user', 
                                  targetId: user.id, 
                                  targetName: user.name 
                                })}
                                className="text-orange-600 hover:text-orange-700"
                              >
                                <i className="fas fa-flag mr-2"></i>
                                Report
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reports.map((report: any) => (
                    <div key={report.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <Badge className={getSeverityColor(report.severity || 'medium')}>
                            {(report.severity || 'MEDIUM').toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {report.type}
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(report.createdAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <p className="font-medium mb-2">Report:</p>
                        <p className="text-sm">{report.description}</p>
                      </div>

                      <div className="flex justify-end">
                        <Button size="sm">
                          <i className="fas fa-gavel mr-2"></i>
                          Resolve
                        </Button>
                      </div>
                    </div>
                  ))}
                  {reports.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <i className="fas fa-flag text-4xl mb-4"></i>
                      <p>No reports to review</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Total Buyers</span>
                      <span className="font-bold">{users.filter((u: any) => u.role === 'buyer').length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Total Providers</span>
                      <span className="font-bold">{users.filter((u: any) => u.role === 'provider').length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Growth Rate</span>
                      <span className="font-bold text-green-600">+12.5%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Content Moderation Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Items Moderated Today</span>
                      <span className="font-bold">24</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Approval Rate</span>
                      <span className="font-bold text-green-600">87.5%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Average Response Time</span>
                      <span className="font-bold">2.3 hours</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Moderation Dialog */}
        <Dialog open={moderationDialog.open} onOpenChange={(open) => setModerationDialog({...moderationDialog, open})}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {moderationDialog.action === 'approve' ? 'Approve Content' : 'Reject Content'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Content:</p>
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="text-sm">{moderationDialog.item?.content}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Reason for {moderationDialog.action}:
                </label>
                <Textarea
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  placeholder={`Provide a reason for ${moderationDialog.action}ing this content...`}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setModerationDialog({ open: false, item: null, action: '' })}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={submitModeration}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  {approveMutation.isPending || rejectMutation.isPending ? 'Processing...' : 'Confirm'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* User Action Dialog */}
        <Dialog open={userActionDialog.open} onOpenChange={(open) => setUserActionDialog({...userActionDialog, open})}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {userActionDialog.action === 'suspend' ? 'Suspend User' : 'User Action'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">User:</p>
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="font-medium">{userActionDialog.user?.name}</p>
                  <p className="text-sm text-gray-600">{userActionDialog.user?.email}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Reason for suspension:
                </label>
                <Textarea
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  placeholder="Provide a reason for suspending this user..."
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setUserActionDialog({ open: false, user: null, action: '' })}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={submitUserAction}
                  disabled={suspendUserMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {suspendUserMutation.isPending ? 'Processing...' : 'Suspend User'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Report Modal */}
        <ReportModal
          open={reportModal.open}
          onOpenChange={(open) => setReportModal(prev => ({ ...prev, open }))}
          targetType={reportModal.targetType}
          targetId={reportModal.targetId}
          targetName={reportModal.targetName}
        />
      </div>
    </div>
  );
}