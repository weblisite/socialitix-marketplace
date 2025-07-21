import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Clock, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { VerificationReview } from './verification-review';

interface PendingVerification {
  id: number;
  action_type: string;
  platform: string;
  target_url: string;
  comment_text?: string;
  proof_url: string;
  submitted_at: string;
  provider_name: string;
  time_remaining: number | null;
}

export function PendingVerifications() {
  const [verifications, setVerifications] = useState<PendingVerification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<PendingVerification | null>(null);
  const { toast } = useToast();

  const fetchVerifications = async () => {
    try {
      const response = await fetch('/api/buyer/pending-verifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVerifications(data);
      } else {
        throw new Error('Failed to fetch verifications');
      }
    } catch (error) {
      console.error('Error fetching verifications:', error);
      toast({
        title: "Error",
        description: "Failed to load pending verifications",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchVerifications();
  };

  const handleVerificationComplete = () => {
    setSelectedVerification(null);
    fetchVerifications(); // Refresh the list
  };

  const formatTimeRemaining = (milliseconds: number) => {
    if (milliseconds <= 0) return 'Expired';
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusBadge = (timeRemaining: number | null) => {
    if (!timeRemaining || timeRemaining <= 0) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (timeRemaining < 60 * 60 * 1000) { // Less than 1 hour
      return <Badge variant="destructive">Urgent</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const getStatusIcon = (timeRemaining: number | null) => {
    if (!timeRemaining || timeRemaining <= 0) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (timeRemaining < 60 * 60 * 1000) { // Less than 1 hour
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading verifications...</span>
      </div>
    );
  }

  if (selectedVerification) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => setSelectedVerification(null)}
          className="mb-4"
        >
          ← Back to Verifications
        </Button>
        <VerificationReview
          verification={selectedVerification}
          onVerificationComplete={handleVerificationComplete}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pending Verifications</h2>
          <p className="text-gray-600">
            Review and verify proof submissions from providers
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {verifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Pending Verifications</h3>
            <p className="text-gray-600 text-center">
              All proof submissions have been reviewed or are being processed by our AI system.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Summary Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Verification Reminder:</strong> You have {verifications.length} pending verification(s). 
              Each verification has a 48-hour window for manual review. After that, our AI system will automatically analyze the proof.
            </AlertDescription>
          </Alert>

          {/* Verifications List */}
          {verifications.map((verification) => (
            <Card key={verification.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {getStatusIcon(verification.time_remaining)}
                      <div>
                        <h3 className="font-medium">
                          {verification.action_type} on {verification.platform}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Provider: {verification.provider_name}
                        </p>
                      </div>
                      {getStatusBadge(verification.time_remaining)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">
                          <strong>Target:</strong> {verification.target_url}
                        </p>
                        {verification.comment_text && (
                          <p className="text-sm text-gray-600">
                            <strong>Comment:</strong> {verification.comment_text}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          <strong>Submitted:</strong> {new Date(verification.submitted_at).toLocaleString()}
                        </p>
                        {verification.time_remaining !== null && (
                          <p className="text-sm text-gray-600">
                            <strong>Time Remaining:</strong> {formatTimeRemaining(verification.time_remaining)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Proof Preview */}
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Proof Screenshot:</p>
                      <div className="border rounded-lg overflow-hidden bg-gray-100 w-32 h-24">
                        <img
                          src={verification.proof_url}
                          alt="Proof preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = `
                              <div class="flex items-center justify-center h-full text-gray-400 text-xs">
                                <span>Preview</span>
                              </div>
                            `;
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="ml-4">
                    <Button
                      onClick={() => setSelectedVerification(verification)}
                      disabled={!verification.time_remaining || verification.time_remaining <= 0}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      {verification.time_remaining && verification.time_remaining > 0 
                        ? 'Review & Verify' 
                        : 'View Details'
                      }
                    </Button>
                  </div>
                </div>

                {/* Expired Notice */}
                {verification.time_remaining !== null && verification.time_remaining <= 0 && (
                  <Alert className="mt-4 bg-blue-50 border-blue-200">
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      The manual verification window has expired. Our AI system will automatically analyze this proof 
                      and notify you of the result.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 