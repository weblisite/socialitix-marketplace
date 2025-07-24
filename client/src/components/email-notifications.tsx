import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth';

interface EmailNotification {
  id: number;
  type: string;
  title: string;
  content: string;
  sentAt: string;
  status: 'sent' | 'failed' | 'pending';
  read: boolean;
}

interface NotificationPreferences {
  transactionUpdates: boolean;
  assignmentNotifications: boolean;
  withdrawalConfirmations: boolean;
  promotionalEmails: boolean;
  securityAlerts: boolean;
  weeklyReports: boolean;
}

export default function EmailNotifications() {
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    transactionUpdates: true,
    assignmentNotifications: true,
    withdrawalConfirmations: true,
    promotionalEmails: false,
    securityAlerts: true,
    weeklyReports: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      // Fetch real notifications from the API
      const response = await apiRequest('GET', '/api/email/notifications');
      if (response && response.ok) {
        const data = await response.json();
        setNotifications(data || []);
      } else {
        // Fallback to empty array if API fails
        setNotifications([]);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      // Fallback to empty array on error
      setNotifications([]);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async () => {
    setIsUpdating(true);
    try {
      await apiRequest('POST', '/api/email/preferences', preferences);
      toast({
        title: 'Success',
        description: 'Notification preferences updated successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update preferences',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await apiRequest('POST', `/api/email/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive'
      });
    }
  };

  const sendTestEmail = async () => {
    try {
      // Use the actual user's email instead of hardcoded test email
      const userEmail = user?.email || 'test@example.com';
      await apiRequest('POST', '/api/email/send', {
        to: userEmail,
        templateName: 'test_notification',
        variables: {
          userName: user?.name || 'User',
          message: 'This is a test notification'
        }
      });
      toast({
        title: 'Test Email Sent',
        description: `A test email has been sent to ${userEmail}`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send test email',
        variant: 'destructive'
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'transaction': return 'fas fa-credit-card text-green-600';
      case 'assignment': return 'fas fa-tasks text-blue-600';
      case 'withdrawal': return 'fas fa-money-bill-wave text-purple-600';
      case 'security': return 'fas fa-shield-alt text-red-600';
      case 'promotional': return 'fas fa-bullhorn text-orange-600';
      default: return 'fas fa-envelope text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <i className="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Email Notifications</h2>
        <Button onClick={sendTestEmail} variant="outline">
          <i className="fas fa-paper-plane mr-2"></i>
          Send Test Email
        </Button>
      </div>

      <Tabs defaultValue="history" className="space-y-6">
        <TabsList>
          <TabsTrigger value="history">Notification History</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <i className="fas fa-envelope text-4xl mb-4"></i>
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`border rounded-lg p-4 ${!notification.read ? 'bg-blue-50 border-blue-200' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <i className={`${getNotificationIcon(notification.type)} text-xl mt-1`}></i>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium">{notification.title}</h4>
                              {!notification.read && (
                                <Badge className="bg-blue-100 text-blue-800">New</Badge>
                              )}
                              <Badge className={getStatusColor(notification.status)}>
                                {notification.status.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{notification.content}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(notification.sentAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {!notification.read && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => markAsRead(notification.id)}
                          >
                            Mark as Read
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="transaction-updates" className="text-base font-medium">
                        Transaction Updates
                      </Label>
                      <p className="text-sm text-gray-600">
                        Get notified about payment confirmations and order status
                      </p>
                    </div>
                    <Switch
                      id="transaction-updates"
                      checked={preferences.transactionUpdates}
                      onCheckedChange={(checked) => 
                        setPreferences(prev => ({ ...prev, transactionUpdates: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="assignment-notifications" className="text-base font-medium">
                        Assignment Notifications
                      </Label>
                      <p className="text-sm text-gray-600">
                        Receive alerts for new assignments and completion updates
                      </p>
                    </div>
                    <Switch
                      id="assignment-notifications"
                      checked={preferences.assignmentNotifications}
                      onCheckedChange={(checked) => 
                        setPreferences(prev => ({ ...prev, assignmentNotifications: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="withdrawal-confirmations" className="text-base font-medium">
                        Withdrawal Confirmations
                      </Label>
                      <p className="text-sm text-gray-600">
                        Get notified when withdrawals are processed
                      </p>
                    </div>
                    <Switch
                      id="withdrawal-confirmations"
                      checked={preferences.withdrawalConfirmations}
                      onCheckedChange={(checked) => 
                        setPreferences(prev => ({ ...prev, withdrawalConfirmations: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="security-alerts" className="text-base font-medium">
                        Security Alerts
                      </Label>
                      <p className="text-sm text-gray-600">
                        Important security notifications and account updates
                      </p>
                    </div>
                    <Switch
                      id="security-alerts"
                      checked={preferences.securityAlerts}
                      onCheckedChange={(checked) => 
                        setPreferences(prev => ({ ...prev, securityAlerts: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="weekly-reports" className="text-base font-medium">
                        Weekly Reports
                      </Label>
                      <p className="text-sm text-gray-600">
                        Receive weekly summaries of your activity
                      </p>
                    </div>
                    <Switch
                      id="weekly-reports"
                      checked={preferences.weeklyReports}
                      onCheckedChange={(checked) => 
                        setPreferences(prev => ({ ...prev, weeklyReports: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="promotional-emails" className="text-base font-medium">
                        Promotional Emails
                      </Label>
                      <p className="text-sm text-gray-600">
                        Receive offers, discounts, and promotional content
                      </p>
                    </div>
                    <Switch
                      id="promotional-emails"
                      checked={preferences.promotionalEmails}
                      onCheckedChange={(checked) => 
                        setPreferences(prev => ({ ...prev, promotionalEmails: checked }))
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={updatePreferences}
                    disabled={isUpdating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isUpdating ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-2"></i>
                        Save Preferences
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 