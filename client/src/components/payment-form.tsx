import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, CreditCard, Smartphone, Building } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface PaymentFormProps {
  amount: number;
  serviceId: string;
  quantity: number;
  targetUrl: string;
  commentText: string;
  onSuccess: (paymentId: string) => void;
  onCancel: () => void;
}

interface PaymentConfig {
  publishable_key: string;
  currency: string;
  supported_methods: string[];
}

export function PaymentForm({
  amount,
  serviceId,
  quantity,
  targetUrl,
  commentText,
  onSuccess,
  onCancel
}: PaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load payment configuration
    fetchPaymentConfig();
  }, []);

  const fetchPaymentConfig = async () => {
    try {
      const response = await fetch('/api/payment/config');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error loading payment config:', error);
      setError('Failed to load payment configuration');
    }
  };

  const createPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount,
          service_id: serviceId,
          quantity,
          target_url: targetUrl,
          comment_text: commentText
        })
      });

      const data = await response.json();

      if (data.success) {
        setPaymentUrl(data.payment_url);
        setPaymentId(data.payment_id);
        
        // Open payment URL in new window
        window.open(data.payment_url, '_blank', 'width=600,height=700');
        
        toast({
          title: "Payment initiated",
          description: "Please complete your payment in the new window.",
        });

        // Start polling for payment status
        pollPaymentStatus(data.payment_id);
      } else {
        setError(data.message || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      setError('Failed to create payment request');
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (paymentId: string) => {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setError('Payment verification timeout. Please check your payment status.');
        return;
      }

      try {
        const response = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ payment_id: paymentId })
        });

        const data = await response.json();

        if (data.success && data.status === 'completed') {
          toast({
            title: "Payment successful!",
            description: "Your order has been placed successfully.",
          });
          onSuccess(paymentId);
          return;
        } else if (data.success && data.status === 'failed') {
          setError('Payment failed. Please try again.');
          return;
        }

        // Continue polling
        attempts++;
        setTimeout(poll, 5000);
      } catch (error) {
        console.error('Error polling payment status:', error);
        attempts++;
        setTimeout(poll, 5000);
      }
    };

    poll();
  };

  const handleManualVerification = async () => {
    if (!paymentId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ payment_id: paymentId })
      });

      const data = await response.json();

      if (data.success && data.status === 'completed') {
        toast({
          title: "Payment verified!",
          description: "Your order has been placed successfully.",
        });
        onSuccess(paymentId);
      } else {
        setError('Payment not yet completed. Please complete your payment and try again.');
      }
    } catch (error) {
      setError('Failed to verify payment status');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-red-600">Payment Error</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex gap-2 mt-4">
            <Button onClick={onCancel} variant="outline">
              Cancel
            </Button>
            <Button onClick={() => setError(null)}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (paymentUrl) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Complete Payment</CardTitle>
          <CardDescription>
            Please complete your payment using one of the supported methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>Credit/Debit Card</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Smartphone className="h-4 w-4" />
              <span>M-Pesa</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building className="h-4 w-4" />
              <span>Bank Transfer</span>
            </div>
            
            <div className="pt-4">
              <Button 
                onClick={() => window.open(paymentUrl, '_blank', 'width=600,height=700')}
                className="w-full"
              >
                Open Payment Page
              </Button>
            </div>
            
            <div className="text-center">
              <Button 
                onClick={handleManualVerification}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'I have completed payment'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
        <CardDescription>
          Complete your purchase using IntaSend
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="font-medium">Total Amount:</span>
            <span className="text-lg font-bold">KES {amount.toFixed(2)}</span>
          </div>

          <div className="space-y-2">
            <Label>Service</Label>
            <Input value={serviceId} disabled />
          </div>

          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input value={quantity} disabled />
          </div>

          {targetUrl && (
            <div className="space-y-2">
              <Label>Target URL</Label>
              <Input value={targetUrl} disabled />
            </div>
          )}

          {commentText && (
            <div className="space-y-2">
              <Label>Comment</Label>
              <Input value={commentText} disabled />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button onClick={onCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={createPayment}
              disabled={loading || !config}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Pay Now'
              )}
            </Button>
          </div>

          {config && (
            <div className="text-xs text-muted-foreground text-center">
              Powered by IntaSend • Secure Payment Processing
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 