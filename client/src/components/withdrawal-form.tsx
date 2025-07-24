import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Loader2, Banknote, AlertCircle, CreditCard, Smartphone } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface WithdrawalFormProps {
  currentBalance: number;
  onSuccess: () => void;
  onCancel: () => void;
}

interface PaymentDetails {
  // M-Pesa & Airtel Money
  phone_number?: string;
  // Bank Transfer
  account_number?: string;
  bank_code?: string;
  account_name?: string;
  // PayPal
  paypal_email?: string;
}

// Kenyan banks supported by IntaSend
const KENYAN_BANKS = [
  { code: '01', name: 'Co-operative Bank of Kenya' },
  { code: '02', name: 'Barclays Bank of Kenya' },
  { code: '03', name: 'Standard Chartered Bank Kenya' },
  { code: '04', name: 'Kenya Commercial Bank' },
  { code: '05', name: 'Equity Bank Kenya' },
  { code: '06', name: 'National Bank of Kenya' },
  { code: '07', name: 'Diamond Trust Bank Kenya' },
  { code: '08', name: 'NIC Bank Kenya' },
  { code: '09', name: 'Commercial Bank of Africa' },
  { code: '10', name: 'I&M Bank Kenya' },
  { code: '11', name: 'Family Bank Kenya' },
  { code: '12', name: 'Gulf African Bank' },
  { code: '13', name: 'First Community Bank' },
  { code: '14', name: 'Consolidated Bank of Kenya' },
  { code: '15', name: 'Chase Bank Kenya' },
  { code: '16', name: 'Middle East Bank Kenya' },
  { code: '17', name: 'Credit Bank Kenya' },
  { code: '18', name: 'Mwalimu National Sacco' },
  { code: '19', name: 'Unaitas Sacco' },
  { code: '20', name: 'Kenya Post Office Savings Bank' }
];

const PAYMENT_METHODS = [
  { value: 'mpesa', label: 'M-Pesa', icon: 'fas fa-mobile-alt', description: 'Mobile money transfer' },
  { value: 'airtel_money', label: 'Airtel Money', icon: 'fas fa-mobile-alt', description: 'Mobile money transfer' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: 'fas fa-university', description: 'Direct bank transfer' },
  { value: 'paypal', label: 'PayPal', icon: 'fab fa-paypal', description: 'International payment' }
];

export function WithdrawalForm({
  currentBalance,
  onSuccess,
  onCancel
}: WithdrawalFormProps) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({});
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Calculate transaction fee (3%)
  const withdrawalFee = amount ? parseFloat(amount) * 0.03 : 0;
  const netAmount = amount ? parseFloat(amount) - withdrawalFee : 0;

  const validateForm = () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return false;
    }

    if (parseFloat(amount) > currentBalance) {
      setError('Insufficient balance');
      return false;
    }

    if (netAmount <= 0) {
      setError('Amount is too small after withdrawal fee');
      return false;
    }

    if (!paymentMethod) {
      setError('Please select a payment method');
      return false;
    }

    // Validate payment method specific details
    switch (paymentMethod) {
      case 'mpesa':
      case 'airtel_money':
        if (!paymentDetails.phone_number) {
          setError('Please enter your phone number');
          return false;
        }
        if (!/^(\+254|0)[17]\d{8}$/.test(paymentDetails.phone_number)) {
          setError('Please enter a valid Kenyan phone number');
          return false;
        }
        break;
      case 'bank_transfer':
        if (!paymentDetails.account_number || !paymentDetails.bank_code || !paymentDetails.account_name) {
          setError('Please fill in all bank details');
          return false;
        }
        break;
      case 'paypal':
        if (!paymentDetails.paypal_email) {
          setError('Please enter your PayPal email');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paymentDetails.paypal_email)) {
          setError('Please enter a valid email address');
          return false;
        }
        break;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          payment_details: paymentDetails
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Withdrawal requested",
          description: `KES ${netAmount.toFixed(2)} will be transferred via ${PAYMENT_METHODS.find(p => p.value === paymentMethod)?.label}.`,
        });
        onSuccess();
      } else {
        setError(data.message || 'Failed to process withdrawal');
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      setError('Failed to process withdrawal request');
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentMethodFields = () => {
    switch (paymentMethod) {
      case 'mpesa':
      case 'airtel_money':
        return (
          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input
              id="phone_number"
              type="tel"
              value={paymentDetails.phone_number || ''}
              onChange={(e) => setPaymentDetails(prev => ({ ...prev, phone_number: e.target.value }))}
              placeholder="e.g., +254712345678 or 0712345678"
              required
            />
            <p className="text-xs text-gray-500">
              Enter your {paymentMethod === 'mpesa' ? 'M-Pesa' : 'Airtel Money'} registered phone number
            </p>
          </div>
        );

      case 'bank_transfer':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bank">Select Bank</Label>
              <Select
                value={paymentDetails.bank_code || ''}
                onValueChange={(value) => setPaymentDetails(prev => ({ ...prev, bank_code: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose your bank" />
                </SelectTrigger>
                <SelectContent>
                  {KENYAN_BANKS.map((bank) => (
                    <SelectItem key={bank.code} value={bank.code}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number</Label>
              <Input
                id="account_number"
                type="text"
                value={paymentDetails.account_number || ''}
                onChange={(e) => setPaymentDetails(prev => ({ ...prev, account_number: e.target.value }))}
                placeholder="Enter account number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_name">Account Name</Label>
              <Input
                id="account_name"
                type="text"
                value={paymentDetails.account_name || ''}
                onChange={(e) => setPaymentDetails(prev => ({ ...prev, account_name: e.target.value }))}
                placeholder="Enter account holder name"
                required
              />
            </div>
          </div>
        );

      case 'paypal':
        return (
          <div className="space-y-2">
            <Label htmlFor="paypal_email">PayPal Email</Label>
            <Input
              id="paypal_email"
              type="email"
              value={paymentDetails.paypal_email || ''}
              onChange={(e) => setPaymentDetails(prev => ({ ...prev, paypal_email: e.target.value }))}
              placeholder="your-email@example.com"
              required
            />
            <p className="text-xs text-gray-500">
              Enter the email address associated with your PayPal account
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Withdraw Funds</CardTitle>
        <CardDescription>
          Transfer your earnings to your preferred payment method
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="font-medium">Available Balance:</span>
            <span className="text-lg font-bold">KES {currentBalance.toFixed(2)}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Withdrawal Amount (KES)</Label>
            <Input
              id="amount"
              type="number"
              min="100"
              max={currentBalance}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              required
            />
          </div>

          {amount && parseFloat(amount) > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span>Withdrawal Amount:</span>
                <span>KES {parseFloat(amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>Transaction Fee (3%):</span>
                <span>- KES {withdrawalFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-1">
                <span>Net Amount:</span>
                <span>KES {netAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select
              value={paymentMethod}
              onValueChange={setPaymentMethod}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    <div className="flex items-center space-x-2">
                      <i className={method.icon}></i>
                      <span>{method.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {paymentMethod && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-3">
                {PAYMENT_METHODS.find(p => p.value === paymentMethod)?.label} Details
              </h4>
              {renderPaymentMethodFields()}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" onClick={onCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={loading || !amount || parseFloat(amount) <= 0 || !paymentMethod}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Banknote className="mr-2 h-4 w-4" />
                  Withdraw
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>Transaction fee: 3% of withdrawal amount</p>
            <p>Processing time: 1-3 business days</p>
            <p>Minimum withdrawal: KES 100</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 