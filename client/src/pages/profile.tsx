import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import SocialMediaAccounts from '@/components/social-media-accounts';
import { apiRequest } from '@/lib/queryClient';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      await apiRequest(`/api/users/${user?.id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData)
      });

      await updateUser();
      toast({
        title: 'Success',
        description: 'Profile updated successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account and social media connections</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className="fas fa-user"></i>
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label>Account Type</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded border">
                    <div className="flex items-center gap-2">
                      <i className={`fas fa-${user.role === 'buyer' ? 'shopping-cart' : user.role === 'provider' ? 'handshake' : 'shield-alt'}`}></i>
                      <span className="capitalize font-medium">{user.role}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Account type cannot be changed. Contact support if needed.
                  </p>
                </div>

                {user.role === 'provider' && (
                  <div>
                    <Label>Account Balance</Label>
                    <div className="mt-1 p-3 bg-green-50 rounded border">
                      <div className="flex items-center gap-2">
                        <i className="fas fa-coins text-green-600"></i>
                        <span className="font-bold text-green-800">{user.balance} KES</span>
                      </div>
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={isUpdating} className="w-full">
                  {isUpdating ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2"></i>
                      Update Profile
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Social Media Accounts */}
          <div>
            <SocialMediaAccounts />
          </div>
        </div>

        {/* Account Statistics for Providers */}
        {user.role === 'provider' && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className="fas fa-chart-bar"></i>
                Account Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded">
                  <i className="fas fa-tasks text-2xl text-blue-600 mb-2"></i>
                  <p className="text-sm text-gray-600">Total Assignments</p>
                  <p className="text-xl font-bold text-blue-800">-</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded">
                  <i className="fas fa-check-circle text-2xl text-green-600 mb-2"></i>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-xl font-bold text-green-800">-</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded">
                  <i className="fas fa-star text-2xl text-yellow-600 mb-2"></i>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-xl font-bold text-yellow-800">-%</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center">
                Statistics will be available once you complete your first assignments.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Security Settings */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <i className="fas fa-shield-alt"></i>
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button variant="outline" className="w-full">
                <i className="fas fa-key mr-2"></i>
                Change Password
              </Button>
              
              <div className="text-center text-sm text-gray-500">
                <p>For additional security options, please contact support.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}