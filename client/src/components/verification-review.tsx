import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Loader2, 
  AlertTriangle,
  ExternalLink,
  User
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface VerificationReviewProps {
  verification: {
    id: number;
    action_type: string;
    platform: string;
    target_url: string;
    comment_text?: string;
    proof_url: string;
    submitted_at: string;
    provider_name: string;
    time_remaining: number | null;
  };
  onVerificationComplete: () => void;
}

interface VerificationResult {
  success: boolean;
  status: string;
  reason?: string;
}

export function VerificationReview({
  verification,
  onVerificationComplete
}: VerificationReviewProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [reason, setReason] = useState('');
  const { toast } = useToast();

  const formatTimeRemaining = (milliseconds: number) => {
    if (milliseconds <= 0) return 'Expired';
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  const getStatusBadge = () => {
    if (!verification.time_remaining || verification.time_remaining <= 0) {
      return <Badge variant="destructive">Expired - AI will verify</Badge>;
    }
    return <Badge variant="secondary">Pending Manual Verification</Badge>;
  };

  const handleVerify = async (approved: boolean) => {
    if (!verification.time_remaining || verification.time_remaining <= 0) {
      toast({
        title: "Verification expired",
        description: "The 48-hour verification window has expired. AI will automatically verify this proof.",
        variant: "destructive"
      });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const response = await fetch('/api/buyer/verify-proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          assignment_id: verification.id,
          approved,
          reason: reason.trim() || undefined
        })
      });

      const result = await response.json();

      if (response.ok) {
        setVerificationResult({
          success: true,
          status: result.status,
          reason: result.reason
        });

        toast({
          title: approved ? "Proof approved" : "Proof rejected",
          description: result.reason || (approved ? "Provider will be credited for this action" : "Provider will not be credited"),
        });

        onVerificationComplete();
      } else {
        setVerificationResult({
          success: false,
          status: 'error',
          reason: result.message || 'Failed to verify proof'
        });

        toast({
          title: "Verification failed",
          description: result.message || 'Failed to verify proof',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error verifying proof:', error);
      setVerificationResult({
        success: false,
        status: 'error',
        reason: 'Network error occurred'
      });

      toast({
        title: "Verification failed",
        description: "Network error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved_by_buyer':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved_by_buyer':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'rejected':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Review Proof Submission
            </CardTitle>
            <CardDescription>
              Review the proof submitted by {verification.provider_name} for {verification.action_type} on {verification.platform}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Assignment Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Assignment Details</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p><strong>Action:</strong> {verification.action_type}</p>
              <p><strong>Platform:</strong> {verification.platform}</p>
              <p><strong>Provider:</strong> {verification.provider_name}</p>
              <p><strong>Submitted:</strong> {new Date(verification.submitted_at).toLocaleString()}</p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Target Information</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p><strong>Target URL:</strong></p>
              <a 
                href={verification.target_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                {verification.target_url}
                <ExternalLink className="h-3 w-3" />
              </a>
              {verification.comment_text && (
                <p><strong>Comment:</strong> {verification.comment_text}</p>
              )}
            </div>
          </div>
        </div>

        {/* Time Remaining */}
        {verification.time_remaining !== null && (
          <Alert className={verification.time_remaining > 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Verification Deadline:</strong> {formatTimeRemaining(verification.time_remaining)}
              {verification.time_remaining <= 0 && (
                <span className="block mt-1 text-sm">
                  The manual verification window has expired. Our AI system will automatically analyze this proof within the next few hours.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Proof Image */}
        <div className="space-y-2">
          <Label>Proof Screenshot</Label>
          <div className="border rounded-lg overflow-hidden bg-gray-100">
            <img
              src={verification.proof_url}
              alt="Proof screenshot"
              className="w-full max-h-96 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = `
                  <div class="flex items-center justify-center h-64 text-gray-500">
                    <div class="text-center">
                      <AlertTriangle class="h-8 w-8 mx-auto mb-2" />
                      <p>Failed to load image</p>
                    </div>
                  </div>
                `;
              }}
            />
          </div>
          <p className="text-sm text-gray-500">
            Review this screenshot to verify that the {verification.action_type} action has been completed correctly.
          </p>
        </div>

        {/* Verification Instructions */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Verification Guidelines:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Check if the screenshot clearly shows the completed action</li>
              <li>• Verify the target URL and platform match the assignment</li>
              <li>• Ensure the screenshot is not manipulated or reused</li>
              <li>• If you don't verify within 48 hours, AI will automatically analyze the proof</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Verification Result */}
        {verificationResult && (
          <Alert className={getStatusColor(verificationResult.status)}>
            {getStatusIcon(verificationResult.status)}
            <AlertDescription>
              <strong>Verification Result: {verificationResult.status.replace(/_/g, ' ').toUpperCase()}</strong>
              {verificationResult.reason && <p className="mt-1">{verificationResult.reason}</p>}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        {!verificationResult && verification.time_remaining && verification.time_remaining > 0 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="verification-reason">Reason (Optional)</Label>
              <Textarea
                id="verification-reason"
                placeholder="Provide a reason for your decision (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => handleVerify(true)}
                disabled={isVerifying}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve Proof
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => handleVerify(false)}
                disabled={isVerifying}
                variant="destructive"
                className="flex-1"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject Proof
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* AI Verification Notice */}
        {verification.time_remaining !== null && verification.time_remaining <= 0 && !verificationResult && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>AI Verification in Progress</strong>
              <p className="mt-1 text-sm">
                Since the manual verification window has expired, our AI system will automatically analyze this proof 
                to determine if the action was completed correctly. You will be notified of the result.
              </p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
} 