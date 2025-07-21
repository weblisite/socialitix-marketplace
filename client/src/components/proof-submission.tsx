import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Upload, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface ProofSubmissionProps {
  assignmentId: number;
  actionType: string;
  platform: string;
  targetUrl: string;
  commentText?: string;
  onSubmissionComplete: () => void;
}

interface SubmissionResult {
  success: boolean;
  status: string;
  reason?: string;
}

export function ProofSubmission({
  assignmentId,
  actionType,
  platform,
  targetUrl,
  commentText,
  onSubmissionComplete
}: ProofSubmissionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPEG, PNG, WebP)",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      // Clear previous submission result
      setSubmissionResult(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a proof image to submit",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      const formData = new FormData();
      formData.append('proof_image', selectedFile);
      formData.append('assignment_id', assignmentId.toString());

      const response = await fetch('/api/provider/submit-proof', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        setSubmissionResult({
          success: true,
          status: result.status,
          reason: result.reason
        });
        
        toast({
          title: "Proof submitted successfully",
          description: "Your proof has been submitted for verification. The buyer has 48 hours to verify manually.",
        });

        onSubmissionComplete();
      } else {
        setSubmissionResult({
          success: false,
          status: result.status || 'error',
          reason: result.message || 'Failed to submit proof'
        });

        toast({
          title: "Submission failed",
          description: result.message || 'Failed to submit proof',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error submitting proof:', error);
      setSubmissionResult({
        success: false,
        status: 'error',
        reason: 'Network error occurred'
      });

      toast({
        title: "Submission failed",
        description: "Network error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setSubmissionResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'approved_by_buyer':
      case 'approved_by_ai':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
      case 'flagged_for_reuse':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'approved_by_buyer':
      case 'approved_by_ai':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'rejected':
      case 'flagged_for_reuse':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Submit Proof for Verification
        </CardTitle>
        <CardDescription>
          Upload a screenshot showing that you have completed the {actionType} action on {platform}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Assignment Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Assignment Details</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <p><strong>Action:</strong> {actionType}</p>
            <p><strong>Platform:</strong> {platform}</p>
            <p><strong>Target URL:</strong> {targetUrl}</p>
            {commentText && <p><strong>Comment:</strong> {commentText}</p>}
          </div>
        </div>

        {/* File Upload */}
        <div className="space-y-4">
          <Label htmlFor="proof-image">Proof Image (Screenshot)</Label>
          <Input
            id="proof-image"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isSubmitting}
            className="cursor-pointer"
          />
          <p className="text-sm text-gray-500">
            Supported formats: JPEG, JPG, PNG, WebP (max 10MB)
          </p>
        </div>

        {/* Image Preview */}
        {previewUrl && (
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="border rounded-lg overflow-hidden">
              <img
                src={previewUrl}
                alt="Proof preview"
                className="w-full h-64 object-contain bg-gray-100"
              />
            </div>
          </div>
        )}

        {/* Submission Instructions */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Your screenshot should clearly show that the {actionType} action has been completed. 
            The buyer will review this proof and has 48 hours to verify manually. If they don't verify within 48 hours, 
            our AI system will automatically analyze the image for verification.
          </AlertDescription>
        </Alert>

        {/* Submission Result */}
        {submissionResult && (
          <Alert className={getStatusColor(submissionResult.status)}>
            {getStatusIcon(submissionResult.status)}
            <AlertDescription>
              <strong>Status: {submissionResult.status.replace(/_/g, ' ').toUpperCase()}</strong>
              {submissionResult.reason && <p className="mt-1">{submissionResult.reason}</p>}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!submissionResult?.success ? (
            <Button
              onClick={handleSubmit}
              disabled={!selectedFile || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Submit Proof
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleRetry} variant="outline" className="flex-1">
              Submit Another Proof
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 