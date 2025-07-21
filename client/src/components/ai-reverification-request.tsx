import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Eye,
  Clock
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface RejectedAssignment {
  id: number;
  action_type: string;
  platform: string;
  target_url: string;
  comment_text?: string;
  proof_url: string;
  submitted_at: string;
  verified_at: string;
  verification_reason?: string;
  buyer_name: string;
}

interface AIReVerificationRequestProps {
  rejectedAssignments: RejectedAssignment[];
  onReVerificationComplete: () => void;
}

export function AIReVerificationRequest({
  rejectedAssignments,
  onReVerificationComplete
}: AIReVerificationRequestProps) {
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const { toast } = useToast();

  const handleRequestReVerification = async (assignmentId: number) => {
    setIsProcessing(assignmentId);

    try {
      const response = await fetch('/api/provider/request-ai-reverification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          assignment_id: assignmentId
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "AI Re-verification Requested",
          description: "Your request has been submitted. AI will analyze the proof within 24 hours.",
        });

        onReVerificationComplete();
      } else {
        toast({
          title: "Request Failed",
          description: result.message || 'Failed to request AI re-verification',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error requesting AI re-verification:', error);
      toast({
        title: "Request Failed",
        description: "Network error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const getTimeSinceRejection = (verifiedAt: string) => {
    const rejectionTime = new Date(verifiedAt).getTime();
    const now = Date.now();
    const hoursSince = Math.floor((now - rejectionTime) / (1000 * 60 * 60));
    
    if (hoursSince < 24) {
      return `${24 - hoursSince}h until AI auto-re-verification`;
    }
    return 'Eligible for manual re-verification request';
  };

  const isEligibleForManualRequest = (verifiedAt: string) => {
    const rejectionTime = new Date(verifiedAt).getTime();
    const now = Date.now();
    const hoursSince = Math.floor((now - rejectionTime) / (1000 * 60 * 60));
    return hoursSince >= 24;
  };

  if (rejectedAssignments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Rejected Assignments</h3>
          <p className="text-gray-600 text-center">
            You don't have any assignments that were rejected by buyers.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">AI Re-verification Requests</h2>
        <p className="text-gray-600">
          Request AI re-verification for assignments that were rejected by buyers. 
          AI will analyze your proof and may overturn unfair rejections.
        </p>
      </div>

      {/* Information Alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <strong>How it works:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• AI automatically re-verifies buyer rejections after 24 hours</li>
            <li>• You can manually request re-verification after 24 hours</li>
            <li>• If AI overturns the rejection, you'll be credited for the assignment</li>
            <li>• This protects providers from unfair buyer rejections</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Rejected Assignments List */}
      <div className="space-y-4">
        {rejectedAssignments.map((assignment) => {
          const isEligible = isEligibleForManualRequest(assignment.verified_at);
          const timeInfo = getTimeSinceRejection(assignment.verified_at);

          return (
            <Card key={assignment.id} className="border-l-4 border-l-red-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <div>
                        <h3 className="font-medium">
                          {assignment.action_type} on {assignment.platform}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Rejected by {assignment.buyer_name}
                        </p>
                      </div>
                      <Badge variant="destructive">Rejected</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">
                          <strong>Target:</strong> {assignment.target_url}
                        </p>
                        {assignment.comment_text && (
                          <p className="text-sm text-gray-600">
                            <strong>Comment:</strong> {assignment.comment_text}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          <strong>Submitted:</strong> {new Date(assignment.submitted_at).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Rejected:</strong> {new Date(assignment.verified_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Rejection Reason */}
                    {assignment.verification_reason && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm">
                          <strong>Rejection Reason:</strong> {assignment.verification_reason}
                        </p>
                      </div>
                    )}

                    {/* Proof Preview */}
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Your Proof:</p>
                      <div className="border rounded-lg overflow-hidden bg-gray-100 w-32 h-24">
                        <img
                          src={assignment.proof_url}
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

                    {/* Time Information */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{timeInfo}</span>
                    </div>
                  </div>

                  <div className="ml-4">
                    {isEligible ? (
                      <Button
                        onClick={() => handleRequestReVerification(assignment.id)}
                        disabled={isProcessing === assignment.id}
                        className="flex items-center gap-2"
                      >
                        {isProcessing === assignment.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            Request AI Re-verification
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-2">
                          Auto-re-verification in progress
                        </p>
                        <Badge variant="secondary">Waiting</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Information */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> AI re-verification uses advanced image analysis to determine if your proof 
          actually shows the completed action. This system helps protect honest providers from unfair rejections 
          while maintaining quality standards.
        </AlertDescription>
      </Alert>
    </div>
  );
} 