import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2, Eye, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';

interface Withdrawal {
  id: number;
  provider_id: number;
  amount: string;
  fee: string;
  net_amount: string;
  status: string;
  payment_method: string;
  payment_details: any;
  admin_notes?: string;
  processed_by?: number;
  processed_at?: string;
  external_payment_id?: string;
  created_at: string;
  updated_at: string;
  users: {
    id: number;
    email: string;
    full_name: string;
    username: string;
  };
}

const STATUS_COLORS = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  processing: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
  cancelled: 'bg-gray-500/20 text-gray-400'
};

const PAYMENT_METHOD_LABELS = {
  mpesa: 'M-Pesa',
  airtel_money: 'Airtel Money',
  bank_transfer: 'Bank Transfer',
  paypal: 'PayPal'
};

export function WithdrawalManagement() {
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [externalPaymentId, setExternalPaymentId] = useState('');
  const [processingWithdrawal, setProcessingWithdrawal] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch withdrawals
  const { data: withdrawals = [], isLoading } = useQuery({
    queryKey: ['/api/withdrawals'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/withdrawals');
      return response.json();
    },
  });

  // Update withdrawal status mutation
  const updateWithdrawalMutation = useMutation({
    mutationFn: async ({ id, status, admin_notes, external_payment_id }: {
      id: number;
      status: string;
      admin_notes?: string;
      external_payment_id?: string;
    }) => {
      const response = await apiRequest('PUT', `/api/admin/withdrawals/${id}/status`, {
        status,
        admin_notes,
        external_payment_id
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/withdrawals'] });
      toast({
        title: "Withdrawal updated",
        description: "Withdrawal status has been updated successfully.",
      });
      setSelectedWithdrawal(null);
      setStatusUpdate('');
      setAdminNotes('');
      setExternalPaymentId('');
      setProcessingWithdrawal(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update withdrawal",
        variant: "destructive",
      });
      setProcessingWithdrawal(null);
    },
  });

  const handleStatusUpdate = async () => {
    if (!selectedWithdrawal || !statusUpdate) return;

    setProcessingWithdrawal(selectedWithdrawal.id);
    updateWithdrawalMutation.mutate({
      id: selectedWithdrawal.id,
      status: statusUpdate,
      admin_notes: adminNotes || undefined,
      external_payment_id: externalPaymentId || undefined
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const renderPaymentDetails = (withdrawal: Withdrawal) => {
    const details = withdrawal.payment_details;
    
    switch (withdrawal.payment_method) {
      case 'mpesa':
      case 'airtel_money':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Phone Number:</span>
              <span className="text-white font-mono">{details.phone_number}</span>
            </div>
          </div>
        );
      
      case 'bank_transfer':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Bank:</span>
              <span className="text-white">{details.bank_name || details.bank_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Account Number:</span>
              <span className="text-white font-mono">{details.account_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Account Name:</span>
              <span className="text-white">{details.account_name}</span>
            </div>
          </div>
        );
      
      case 'paypal':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">PayPal Email:</span>
              <span className="text-white">{details.paypal_email}</span>
            </div>
          </div>
        );
      
      default:
        return <p className="text-gray-400">Payment details not available</p>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading withdrawals...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Withdrawal Management</h2>
          <p className="text-gray-400">Process provider withdrawal requests</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            {withdrawals.filter((w: Withdrawal) => w.status === 'pending').length} Pending
          </Badge>
          <Badge variant="outline">
            {withdrawals.filter((w: Withdrawal) => w.status === 'processing').length} Processing
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
          <CardDescription>
            Review and process provider withdrawal requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No withdrawal requests found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((withdrawal: Withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{withdrawal.users.full_name}</p>
                        <p className="text-sm text-gray-400">{withdrawal.users.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">KES {parseFloat(withdrawal.amount).toFixed(2)}</p>
                        <p className="text-sm text-gray-400">
                          Net: KES {parseFloat(withdrawal.net_amount).toFixed(2)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {PAYMENT_METHOD_LABELS[withdrawal.payment_method as keyof typeof PAYMENT_METHOD_LABELS]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(withdrawal.status)}
                        <Badge className={STATUS_COLORS[withdrawal.status as keyof typeof STATUS_COLORS]}>
                          {withdrawal.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {new Date(withdrawal.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(withdrawal.created_at).toLocaleTimeString()}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedWithdrawal(withdrawal)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Withdrawal Details</DialogTitle>
                          </DialogHeader>
                          
                          {selectedWithdrawal && (
                            <div className="space-y-6">
                              {/* Provider Info */}
                              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                  <p className="text-sm text-gray-500">Provider</p>
                                  <p className="font-medium">{selectedWithdrawal.users.full_name}</p>
                                  <p className="text-sm text-gray-400">{selectedWithdrawal.users.email}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Request Date</p>
                                  <p className="font-medium">
                                    {new Date(selectedWithdrawal.created_at).toLocaleDateString()}
                                  </p>
                                  <p className="text-sm text-gray-400">
                                    {new Date(selectedWithdrawal.created_at).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>

                              {/* Amount Details */}
                              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                  <p className="text-sm text-gray-500">Requested Amount</p>
                                  <p className="text-lg font-bold">KES {parseFloat(selectedWithdrawal.amount).toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Fee</p>
                                  <p className="text-lg font-bold text-red-600">- KES {parseFloat(selectedWithdrawal.fee).toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Net Amount</p>
                                  <p className="text-lg font-bold text-green-600">KES {parseFloat(selectedWithdrawal.net_amount).toFixed(2)}</p>
                                </div>
                              </div>

                              {/* Payment Details */}
                              <div className="p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-medium mb-3">Payment Details</h4>
                                {renderPaymentDetails(selectedWithdrawal)}
                              </div>

                              {/* Status Update */}
                              {selectedWithdrawal.status === 'pending' && (
                                <div className="space-y-4 p-4 border rounded-lg">
                                  <h4 className="font-medium">Update Status</h4>
                                  
                                  <div className="space-y-2">
                                    <Label htmlFor="status">New Status</Label>
                                    <Select value={statusUpdate} onValueChange={setStatusUpdate}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="processing">Processing</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="failed">Failed</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="external_payment_id">External Payment ID (Optional)</Label>
                                    <Input
                                      id="external_payment_id"
                                      value={externalPaymentId}
                                      onChange={(e) => setExternalPaymentId(e.target.value)}
                                      placeholder="e.g., MPESA123456789"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="admin_notes">Admin Notes (Optional)</Label>
                                    <Textarea
                                      id="admin_notes"
                                      value={adminNotes}
                                      onChange={(e) => setAdminNotes(e.target.value)}
                                      placeholder="Add any notes about this withdrawal..."
                                      rows={3}
                                    />
                                  </div>

                                  <Button
                                    onClick={handleStatusUpdate}
                                    disabled={!statusUpdate || processingWithdrawal === selectedWithdrawal.id}
                                    className="w-full"
                                  >
                                    {processingWithdrawal === selectedWithdrawal.id ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Updating...
                                      </>
                                    ) : (
                                      'Update Status'
                                    )}
                                  </Button>
                                </div>
                              )}

                              {/* Current Status Info */}
                              {selectedWithdrawal.status !== 'pending' && (
                                <div className="p-4 bg-gray-50 rounded-lg">
                                  <h4 className="font-medium mb-2">Current Status</h4>
                                  <div className="flex items-center space-x-2">
                                    {getStatusIcon(selectedWithdrawal.status)}
                                    <Badge className={STATUS_COLORS[selectedWithdrawal.status as keyof typeof STATUS_COLORS]}>
                                      {selectedWithdrawal.status}
                                    </Badge>
                                  </div>
                                  {selectedWithdrawal.processed_at && (
                                    <p className="text-sm text-gray-500 mt-2">
                                      Processed: {new Date(selectedWithdrawal.processed_at).toLocaleString()}
                                    </p>
                                  )}
                                  {selectedWithdrawal.admin_notes && (
                                    <div className="mt-2">
                                      <p className="text-sm text-gray-500">Notes:</p>
                                      <p className="text-sm">{selectedWithdrawal.admin_notes}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 