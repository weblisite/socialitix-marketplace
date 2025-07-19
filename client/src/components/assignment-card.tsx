import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Assignment {
  id: number;
  actionType: string;
  platform: string;
  targetUrl: string;
  commentText?: string;
  status: string;
  earnings: string;
  assignedAt: string;
  buyerName: string;
  proofUrl?: string;
}

interface AssignmentCardProps {
  assignment: Assignment;
  onUpdate: () => void;
}

export default function AssignmentCard({ assignment, onUpdate }: AssignmentCardProps) {
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return 'fab fa-instagram text-pink-600';
      case 'youtube': return 'fab fa-youtube text-red-600';
      case 'twitter': return 'fab fa-twitter text-blue-500';
      case 'tiktok': return 'fab fa-tiktok text-black';
      default: return 'fas fa-globe';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'verified': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionInstructions = () => {
    const platformName = assignment.platform.charAt(0).toUpperCase() + assignment.platform.slice(1);
    
    switch (assignment.actionType) {
      case 'followers':
        return `Follow the ${platformName} account at the target URL. Make sure to use your authentic account.`;
      case 'likes':
        return `Like the post/video at the target URL using your authentic account.`;
      case 'comments':
        return assignment.commentText 
          ? `Post this exact comment: "${assignment.commentText}"` 
          : 'Post a meaningful, relevant comment on the content.';
      case 'views':
        return `View the content at the target URL. Watch/view the entire content to ensure it counts.`;
      case 'subscribers':
        return `Subscribe to the ${platformName} channel at the target URL.`;
      case 'reposts':
      case 'shares':
        return `Share/repost the content at the target URL on your ${platformName} account.`;
      default:
        return `Complete the requested ${assignment.actionType} action at the target URL.`;
    }
  };

  const handleStartAssignment = async () => {
    try {
      await apiRequest(`/api/assignments/${assignment.id}/start`, {
        method: 'POST'
      });
      toast({
        title: 'Assignment Started',
        description: 'You can now work on this assignment'
      });
      onUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start assignment',
        variant: 'destructive'
      });
    }
  };

  const handleSubmitProof = async () => {
    if (!proofFile && assignment.actionType !== 'views') {
      toast({
        title: 'Error',
        description: 'Please select a proof image',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (proofFile) {
        formData.append('proof', proofFile);
      }

      await apiRequest(`/api/assignments/${assignment.id}/submit-proof`, {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set Content-Type for FormData
      });

      toast({
        title: 'Proof Submitted',
        description: 'Your proof has been submitted for verification'
      });

      setIsProofModalOpen(false);
      setProofFile(null);
      onUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit proof',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className={getPlatformIcon(assignment.platform)}></i>
            <span className="capitalize">{assignment.actionType}</span>
          </div>
          <div className={`px-2 py-1 rounded text-xs ${getStatusColor(assignment.status)}`}>
            {assignment.status.replace('_', ' ').toUpperCase()}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">Target:</p>
          <a 
            href={assignment.targetUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline break-all text-sm"
          >
            {assignment.targetUrl}
          </a>
        </div>

        {assignment.commentText && (
          <div>
            <p className="text-sm text-gray-600 mb-2">Comment to post:</p>
            <div className="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
              <p className="text-sm italic">"{assignment.commentText}"</p>
            </div>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-600 mb-1">Instructions:</p>
          <p className="text-sm bg-blue-50 p-3 rounded">
            {getActionInstructions()}
          </p>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Earnings:</span>
          <span className="font-semibold text-green-600">{assignment.earnings} KES</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Buyer:</span>
          <span>{assignment.buyerName}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Assigned:</span>
          <span>{new Date(assignment.assignedAt).toLocaleDateString()}</span>
        </div>

        {assignment.status === 'assigned' && (
          <Button onClick={handleStartAssignment} className="w-full">
            <i className="fas fa-play mr-2"></i>
            Start Assignment
          </Button>
        )}

        {assignment.status === 'in_progress' && (
          <Dialog open={isProofModalOpen} onOpenChange={setIsProofModalOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <i className="fas fa-upload mr-2"></i>
                Submit Proof
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Proof of Completion</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="proof-file">Upload Screenshot</Label>
                  <input
                    id="proof-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="w-full p-2 border rounded mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload a screenshot showing you completed the action (PNG, JPG, WebP - max 10MB)
                  </p>
                </div>

                {assignment.actionType === 'views' && (
                  <p className="text-sm bg-yellow-50 p-3 rounded border-l-4 border-yellow-500">
                    <i className="fas fa-info-circle mr-1"></i>
                    For view actions, proof image is optional as views are automatically tracked.
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsProofModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmitProof}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Proof'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {assignment.status === 'completed' && (
          <div className="bg-purple-50 p-3 rounded border-l-4 border-purple-500">
            <p className="text-sm">
              <i className="fas fa-clock mr-1"></i>
              Proof submitted. Awaiting verification.
            </p>
          </div>
        )}

        {assignment.status === 'verified' && (
          <div className="bg-green-50 p-3 rounded border-l-4 border-green-500">
            <p className="text-sm">
              <i className="fas fa-check-circle mr-1"></i>
              Assignment completed and verified! Earnings added to your balance.
            </p>
          </div>
        )}

        {assignment.status === 'failed' && (
          <div className="bg-red-50 p-3 rounded border-l-4 border-red-500">
            <p className="text-sm">
              <i className="fas fa-times-circle mr-1"></i>
              Assignment failed verification. Please contact support if you believe this is an error.
            </p>
          </div>
        )}

        {assignment.proofUrl && (
          <div>
            <p className="text-sm text-gray-600 mb-2">Submitted proof:</p>
            <img 
              src={assignment.proofUrl} 
              alt="Proof of completion" 
              className="w-full max-w-xs rounded border"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}