import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2, Banknote, AlertCircle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface WithdrawalFormProps {
  currentBalance: number;
  onSuccess: () => void;
  onCancel: () => void;
}

interface BankDetails {
  account_number: string;
  bank_code: string;
  account_name: string;
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

export function WithdrawalForm({
  currentBalance,
  onSuccess,
  onCancel
}: WithdrawalFormProps) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    account_number: '',
    bank_code: '',
    account_name: ''
  });
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Calculate withdrawal fee (50 KES)
  const withdrawalFee = 50;
  const netAmount = parseFloat(amount) - withdrawalFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!amount || !bankDetails.account_number || !bankDetails.bank_code || !bankDetails.account_name) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (parseFloat(amount) > currentBalance) {
      setError('Insufficient balance');
      setLoading(false);
      return;
    }

    if (netAmount <= 0) {
      setError('Amount is too small after withdrawal fee');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/withdrawal/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          bank_details: bankDetails
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Withdrawal requested",
          description: `KES ${netAmount.toFixed(2)} will be transferred to your account.`,
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

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Withdraw Funds</CardTitle>
        <CardDescription>
          Transfer your earnings to your bank account
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
                <span>Withdrawal Fee:</span>
                <span>- KES {withdrawalFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-1">
                <span>Net Amount:</span>
                <span>KES {netAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="bank">Select Bank</Label>
            <Select
              value={bankDetails.bank_code}
              onValueChange={(value) => setBankDetails(prev => ({ ...prev, bank_code: value }))}
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
              value={bankDetails.account_number}
              onChange={(e) => setBankDetails(prev => ({ ...prev, account_number: e.target.value }))}
              placeholder="Enter account number"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_name">Account Name</Label>
            <Input
              id="account_name"
              type="text"
              value={bankDetails.account_name}
              onChange={(e) => setBankDetails(prev => ({ ...prev, account_name: e.target.value }))}
              placeholder="Enter account holder name"
              required
            />
          </div>

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
              disabled={loading || !amount || parseFloat(amount) <= 0}
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

          <div className="text-xs text-muted-foreground text-center">
            Withdrawal fee: KES 50 • Processing time: 1-3 business days
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 