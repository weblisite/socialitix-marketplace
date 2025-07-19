import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SocialAccount {
  id: number;
  platform: string;
  username: string;
  isVerified: boolean;
  lastSync?: string;
}

export default function SocialMediaAccounts() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    platform: '',
    username: '',
    accessToken: ''
  });
  const { toast } = useToast();

  const platforms = [
    { value: 'instagram', label: 'Instagram', icon: 'fab fa-instagram', color: 'text-pink-600' },
    { value: 'youtube', label: 'YouTube', icon: 'fab fa-youtube', color: 'text-red-600' },
    { value: 'twitter', label: 'Twitter', icon: 'fab fa-twitter', color: 'text-blue-500' },
    { value: 'tiktok', label: 'TikTok', icon: 'fab fa-tiktok', color: 'text-black' }
  ];

  const loadAccounts = async () => {
    try {
      const response = await apiRequest('/api/social-accounts');
      setAccounts(response);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load social media accounts',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.platform || !formData.username) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      await apiRequest('/api/social-accounts', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      toast({
        title: 'Success',
        description: 'Social media account linked successfully'
      });

      setFormData({ platform: '', username: '', accessToken: '' });
      setIsModalOpen(false);
      loadAccounts();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to link social media account',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading social media accounts...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <i className="fas fa-link"></i>
            Social Media Accounts
          </CardTitle>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <i className="fas fa-plus mr-2"></i>
                Link Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link Social Media Account</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="platform">Platform</Label>
                  <Select value={formData.platform} onValueChange={(value) => setFormData({...formData, platform: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms.map(platform => (
                        <SelectItem key={platform.value} value={platform.value}>
                          <div className="flex items-center gap-2">
                            <i className={`${platform.icon} ${platform.color}`}></i>
                            {platform.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    placeholder="@username"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="accessToken">Access Token (Optional)</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    value={formData.accessToken}
                    onChange={(e) => setFormData({...formData, accessToken: e.target.value})}
                    placeholder="For API verification"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Access token enables automatic verification. Leave blank for manual verification.
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Link Account
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-unlink text-4xl mb-4"></i>
            <p>No social media accounts linked yet.</p>
            <p className="text-sm">Link your accounts to enable automatic action verification.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {accounts.map((account) => {
              const platform = platforms.find(p => p.value === account.platform);
              return (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <i className={`${platform?.icon} ${platform?.color} text-xl`}></i>
                    <div>
                      <p className="font-medium">{platform?.label}</p>
                      <p className="text-sm text-gray-600">@{account.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded text-xs ${
                      account.isVerified 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {account.isVerified ? (
                        <>
                          <i className="fas fa-check-circle mr-1"></i>
                          Verified
                        </>
                      ) : (
                        <>
                          <i className="fas fa-clock mr-1"></i>
                          Pending
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}