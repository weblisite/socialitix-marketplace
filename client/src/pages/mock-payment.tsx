import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MockPayment() {
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const amount = urlParams.get('amount') || '1000';
  const reference = urlParams.get('reference') || 'mock-reference';

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsProcessing(true);
      // Simulate payment processing
      setTimeout(() => {
        setIsProcessing(false);
        setIsCompleted(true);
      }, 2000);
    }
  }, [countdown]);

  const handleReturnToApp = () => {
    setLocation('/buyer');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <i className="fas fa-credit-card text-blue-500"></i>
            Mock Payment Gateway
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {countdown > 0 && (
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Simulating payment gateway...
              </p>
              <div className="text-2xl font-bold text-blue-500">
                {countdown}
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Processing payment...</p>
            </div>
          )}

          {isCompleted && (
            <div className="text-center">
              <div className="text-green-500 text-4xl mb-4">
                <i className="fas fa-check-circle"></i>
              </div>
              <h3 className="text-lg font-semibold text-green-600 mb-2">
                Payment Successful!
              </h3>
              <p className="text-gray-600 mb-4">
                Amount: KES {parseInt(amount).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Reference: {reference}
              </p>
              <Button 
                onClick={handleReturnToApp}
                className="w-full"
              >
                Return to App
              </Button>
            </div>
          )}

          <div className="bg-gray-100 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Note:</strong> This is a mock payment gateway for testing purposes. 
              No real money will be charged.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 