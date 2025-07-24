import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string;
  assignment: any;
  onSubmissionComplete: () => void;
}

export function SubmissionModal({ 
  isOpen, 
  onClose, 
  assignmentId, 
  assignment, 
  onSubmissionComplete 
}: SubmissionModalProps) {
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Error",
          description: "File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setScreenshotUrl('');
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('assignmentId', assignmentId);

    const response = await fetch('/api/upload-proof', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload file');
    }

    const result = await response.json();
    return result.url;
  };

  const handleSubmit = async () => {
    if (!screenshotUrl.trim() && !selectedFile) {
      toast({
        title: "Error",
        description: "Please provide a screenshot URL or upload a file",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let finalScreenshotUrl = screenshotUrl;
      
      if (selectedFile) {
        setUploadProgress(50);
        finalScreenshotUrl = await uploadFile(selectedFile);
        setUploadProgress(100);
      }

      const response = await apiRequest('POST', `/api/provider/submit-proof/${assignmentId}`, {
        screenshot_url: finalScreenshotUrl,
        submission_notes: submissionNotes
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success!",
          description: "Proof submitted successfully. Buyer has 48 hours to review.",
        });
        onSubmissionComplete();
        onClose();
        setScreenshotUrl('');
        setSubmissionNotes('');
        setSelectedFile(null);
        setUploadProgress(0);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to submit proof",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit proof",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Submit Proof</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="assignment-details" className="text-gray-300">
              Assignment Details
            </Label>
            <div className="mt-2 p-3 bg-gray-800 rounded-md border border-gray-700">
              <p className="text-sm text-gray-300">
                <strong>Platform:</strong> {assignment?.platform}
              </p>
              <p className="text-sm text-gray-300">
                <strong>Action:</strong> {assignment?.action_type}
              </p>
              {assignment?.target_url && (
                <p className="text-sm text-gray-300">
                  <strong>Target URL:</strong> {assignment.target_url}
                </p>
              )}
              {assignment?.comment_text && (
                <p className="text-sm text-gray-300">
                  <strong>Comment:</strong> {assignment.comment_text}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="file-upload" className="text-gray-300">
              Upload Screenshot *
            </Label>
            <div className="mt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              >
                <i className="fas fa-upload mr-2"></i>
                {selectedFile ? selectedFile.name : 'Choose File'}
              </Button>
              {selectedFile && (
                <p className="text-xs text-gray-400 mt-1">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="screenshot-url" className="text-gray-300">
              Or Screenshot URL
            </Label>
            <Input
              id="screenshot-url"
              type="url"
              placeholder="https://example.com/screenshot.jpg"
              value={screenshotUrl}
              onChange={(e) => setScreenshotUrl(e.target.value)}
              className="mt-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
              disabled={!!selectedFile}
            />
            <p className="text-xs text-gray-400 mt-1">
              Upload your screenshot to an image hosting service and paste the URL here
            </p>
          </div>

          <div>
            <Label htmlFor="submission-notes" className="text-gray-300">
              Additional Notes (Optional)
            </Label>
            <Textarea
              id="submission-notes"
              placeholder="Any additional information about your submission..."
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              className="mt-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
              rows={3}
            />
          </div>

          {uploadProgress > 0 && (
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-lime-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}

          <div className="bg-blue-900/20 border border-blue-700/50 rounded-md p-3">
            <p className="text-sm text-blue-300">
              <strong>Important:</strong> The buyer has 48 hours to review your submission. 
              If they don't respond within this time, our AI system will automatically verify your proof.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (!screenshotUrl.trim() && !selectedFile)}
            className="bg-lime-600 hover:bg-lime-700 text-white"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Proof'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 