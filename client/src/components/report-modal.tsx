import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType?: 'user' | 'service' | 'transaction' | 'content' | 'assignment';
  targetId?: number;
  targetName?: string;
}

export default function ReportModal({ 
  open, 
  onOpenChange, 
  targetType = 'content', 
  targetId, 
  targetName 
}: ReportModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    reason: '',
    description: '',
    severity: 'medium'
  });
  const { toast } = useToast();

  const reportTypes = {
    user: [
      { value: 'harassment', label: 'Harassment or Bullying' },
      { value: 'spam', label: 'Spam or Fake Account' },
      { value: 'inappropriate', label: 'Inappropriate Behavior' },
      { value: 'scam', label: 'Scam or Fraud' },
      { value: 'other', label: 'Other' }
    ],
    service: [
      { value: 'fake_service', label: 'Fake or Misleading Service' },
      { value: 'poor_quality', label: 'Poor Quality Service' },
      { value: 'spam', label: 'Spam or Unwanted Content' },
      { value: 'inappropriate', label: 'Inappropriate Content' },
      { value: 'other', label: 'Other' }
    ],
    assignment: [
      { value: 'service_not_delivered', label: 'Service Not Delivered' },
      { value: 'poor_quality', label: 'Poor Quality Work' },
      { value: 'fake_proof', label: 'Fake Verification Screenshots' },
      { value: 'inappropriate_content', label: 'Inappropriate Content' },
      { value: 'provider_misconduct', label: 'Provider Misconduct' },
      { value: 'other', label: 'Other' }
    ],
    transaction: [
      { value: 'payment_issue', label: 'Payment Issue' },
      { value: 'service_not_delivered', label: 'Service Not Delivered' },
      { value: 'quality_issue', label: 'Quality Issue' },
      { value: 'refund_request', label: 'Refund Request' },
      { value: 'other', label: 'Other' }
    ],
    content: [
      { value: 'inappropriate', label: 'Inappropriate Content' },
      { value: 'spam', label: 'Spam or Unwanted Content' },
      { value: 'copyright', label: 'Copyright Violation' },
      { value: 'harassment', label: 'Harassment or Bullying' },
      { value: 'other', label: 'Other' }
    ]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type || !formData.reason || !formData.description) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest('POST', '/api/reports', {
        type: formData.type,
        reason: formData.reason,
        description: formData.description,
        severity: formData.severity,
        targetType,
        targetId,
        targetName
      });

      toast({
        title: 'Report Submitted',
        description: 'Thank you for your report. We will review it shortly.'
      });

      setFormData({ type: '', reason: '', description: '', severity: 'medium' });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            <i className="fas fa-flag text-red-500 mr-2"></i>
            Report {targetType.charAt(0).toUpperCase() + targetType.slice(1)}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {targetName && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Reporting: <span className="font-medium">{targetName}</span>
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="type">Report Type *</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes[targetType as keyof typeof reportTypes]?.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Select 
              value={formData.reason} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="violation">Policy Violation</SelectItem>
                <SelectItem value="quality">Quality Issue</SelectItem>
                <SelectItem value="fraud">Fraud or Scam</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="severity">Severity</Label>
            <Select 
              value={formData.severity} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Minor issue</SelectItem>
                <SelectItem value="medium">Medium - Moderate concern</SelectItem>
                <SelectItem value="high">High - Serious violation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Please provide detailed information about the issue..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="border-gray-700 bg-gray-800 text-white hover:border-lime-500 hover:text-lime-500 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Submitting...
                </>
              ) : (
                <>
                  <i className="fas fa-flag mr-2"></i>
                  Submit Report
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 