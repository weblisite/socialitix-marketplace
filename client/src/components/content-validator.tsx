import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ContentValidatorProps {
  content: string;
  contentType: 'comment' | 'post' | 'description';
  onValidationComplete: (isValid: boolean, issues: string[]) => void;
  onClose?: () => void;
}

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
  severity: 'low' | 'medium' | 'high';
}

export default function ContentValidator({ 
  content, 
  contentType, 
  onValidationComplete,
  onClose 
}: ContentValidatorProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const { toast } = useToast();

  const validateContent = async () => {
    if (!content.trim()) {
      toast({
        title: 'Empty Content',
        description: 'Please enter some content to validate',
        variant: 'destructive'
      });
      return;
    }

    setIsValidating(true);
    try {
      // First validate the content
      const validationResponse = await apiRequest('POST', '/api/validate-comment', {
        comment: content
      });
      const validationData = await validationResponse.json();

      // Then moderate the content
      const moderationResponse = await apiRequest('POST', '/api/moderate-content', {
        content,
        type: contentType
      });
      const moderationData = await moderationResponse.json();

      const result: ValidationResult = {
        isValid: validationData.isValid && moderationData.isAppropriate,
        issues: [
          ...(validationData.issues || []),
          ...(moderationData.issues || [])
        ],
        suggestions: [
          ...(validationData.suggestions || []),
          ...(moderationData.suggestions || [])
        ],
        severity: moderationData.severity || 'low'
      };

      setValidationResult(result);
      onValidationComplete(result.isValid, result.issues);
    } catch (error) {
      toast({
        title: 'Validation Error',
        description: 'Failed to validate content. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center">
          <i className="fas fa-shield-alt text-blue-600 mr-2"></i>
          Content Validation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content to Validate
          </label>
          <Textarea
            value={content}
            readOnly
            rows={4}
            className="bg-gray-50"
            placeholder="Content will appear here..."
          />
        </div>

        <div className="flex items-center justify-between">
          <Badge variant="outline" className="capitalize">
            {contentType}
          </Badge>
          <div className="flex space-x-2">
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button 
              onClick={validateContent}
              disabled={isValidating || !content.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isValidating ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Validating...
                </>
              ) : (
                <>
                  <i className="fas fa-check mr-2"></i>
                  Validate Content
                </>
              )}
            </Button>
          </div>
        </div>

        {validationResult && (
          <div className="space-y-4">
            <Alert className={validationResult.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertDescription className="flex items-center">
                <i className={`fas ${validationResult.isValid ? 'fa-check-circle text-green-600' : 'fa-exclamation-triangle text-red-600'} mr-2`}></i>
                {validationResult.isValid 
                  ? 'Content is appropriate and ready to post!' 
                  : 'Content needs attention before posting'
                }
              </AlertDescription>
            </Alert>

            {validationResult.severity && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Severity:</span>
                <Badge className={getSeverityColor(validationResult.severity)}>
                  {validationResult.severity.toUpperCase()}
                </Badge>
              </div>
            )}

            {validationResult.issues.length > 0 && (
              <div>
                <h4 className="font-medium text-red-700 mb-2">Issues Found:</h4>
                <ul className="space-y-1">
                  {validationResult.issues.map((issue, index) => (
                    <li key={index} className="text-sm text-red-600 flex items-start">
                      <i className="fas fa-times-circle mr-2 mt-0.5"></i>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {validationResult.suggestions.length > 0 && (
              <div>
                <h4 className="font-medium text-blue-700 mb-2">Suggestions:</h4>
                <ul className="space-y-1">
                  {validationResult.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm text-blue-600 flex items-start">
                      <i className="fas fa-lightbulb mr-2 mt-0.5"></i>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setValidationResult(null)}
              >
                Clear Results
              </Button>
              {validationResult.isValid && (
                <Button className="bg-green-600 hover:bg-green-700">
                  <i className="fas fa-check mr-2"></i>
                  Proceed with Post
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 