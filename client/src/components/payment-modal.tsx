import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: any;
  quantity: number;
  totalCost: number;
  targetUrl: string;
  commentText: string;
  onPaymentSuccess: () => void;
}

export default function PaymentModal({
  open,
  onOpenChange,
  service,
  quantity,
  totalCost,
  targetUrl,
  commentText,
  onPaymentSuccess
}: PaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed'>('pending');
  const { toast } = useToast();

  // Create payment when modal opens
  useEffect(() => {
    if (open && service && !paymentUrl) {
      createPayment();
    }
  }, [open, service]);

  const createPayment = async () => {
    if (!service) return;
    
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/payment/create', {
        amount: totalCost,
        service_id: service.id,
        quantity: quantity,
        target_url: targetUrl,
        comment_text: commentText
      });

      const data = await response.json();

      if (data.success) {
        setPaymentUrl(data.payment_url);
        setPaymentId(data.payment_id);
        
        // Start polling for payment status
        pollPaymentStatus(data.payment_id);
      } else {
        toast({
          title: "Payment Error",
          description: data.message || "Failed to create payment",
          variant: "destructive"
        });
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Payment creation error:', error);
      toast({
        title: "Payment Error",
        description: "Failed to create payment. Please try again.",
        variant: "destructive"
      });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const pollPaymentStatus = async (paymentId: string) => {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await apiRequest('POST', '/api/payment/verify', {
          payment_id: paymentId
        });

        const data = await response.json();

        if (data.success) {
          setPaymentStatus(data.status as 'pending' | 'completed' | 'failed');
          
          if (data.status === 'completed') {
            toast({
              title: "Payment Successful!",
              description: "Your order has been placed and will be processed shortly.",
            });
            onPaymentSuccess();
            onOpenChange(false);
            return;
          } else if (data.status === 'failed') {
            toast({
              title: "Payment Failed",
              description: "Payment was not completed. Please try again.",
              variant: "destructive"
            });
            onOpenChange(false);
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000); // Check every 5 seconds
        } else {
          toast({
            title: "Payment Timeout",
            description: "Payment verification timed out. Please check your order status.",
            variant: "destructive"
          });
          onOpenChange(false);
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000);
        }
      }
    };

    setTimeout(checkStatus, 5000); // Start checking after 5 seconds
  };

  const handlePaymentRedirect = () => {
    if (paymentUrl) {
      window.open(paymentUrl, '_blank');
    }
  };

  const handleCancel = () => {
    setPaymentUrl(null);
    setPaymentId(null);
    setPaymentStatus('pending');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">
            <i className="fas fa-credit-card text-blue-500 mr-2"></i>
            Complete Payment
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Complete your purchase securely through our payment partner
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <h3 className="font-semibold mb-3 text-white">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Service:</span>
                <span className="font-medium text-white">{service?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Quantity:</span>
                <span className="font-medium text-white">{quantity.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Total Amount:</span>
                <span className="font-bold text-lg text-lime-500">KES {totalCost.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-white">Creating payment...</p>
            </div>
          ) : paymentUrl ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mb-4">
                  <i className="fas fa-university text-4xl text-green-500 mb-2"></i>
                  <h3 className="font-semibold text-white">Payment Ready</h3>
                  <p className="text-sm text-gray-300 mt-1">
                    Click below to complete your payment securely
                  </p>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={handlePaymentRedirect}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    <i className="fas fa-lock mr-2"></i>
                    Pay Securely with Intasend
                  </Button>

                  <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
                    <i className="fas fa-shield-alt"></i>
                    <span>Secure payment powered by Intasend</span>
                  </div>
                </div>

                {/* Payment Status Indicator */}
                <div className="mt-6 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-blue-300">
                      {paymentStatus === 'pending' && 'Waiting for payment...'}
                      {paymentStatus === 'completed' && 'Payment completed!'}
                      {paymentStatus === 'failed' && 'Payment failed'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  className="text-sm border-gray-700 bg-gray-800 text-white hover:border-lime-500 hover:text-lime-500 hover:bg-gray-700"
                >
                  Cancel Payment
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-300">Preparing payment...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 