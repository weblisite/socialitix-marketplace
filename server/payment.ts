import { supabase } from './supabase';

// IntaSend API configuration
const INTASEND_API_KEY = process.env.INTASEND_API_SECRET_KEY;
const INTASEND_PUBLISHABLE_KEY = process.env.INTASEND_API_PUBLISHABLE_KEY;
const INTASEND_BASE_URL = 'https://api.intasend.com/api/v1';

if (!INTASEND_API_KEY) {
  console.warn('INTASEND_API_SECRET_KEY not found - payment functionality will be disabled');
}

// Check if the API key is a publishable key (starts with ISPubKey) or secret key
const isPublishableKey = INTASEND_API_KEY?.startsWith('ISPubKey_');
if (isPublishableKey) {
  console.warn('INTASEND_API_SECRET_KEY appears to be a publishable key. For server-side API calls, you need a secret key.');
}

interface PaymentRequest {
  amount: number;
  currency: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  reference: string;
  callback_url?: string;
}

interface PaymentResponse {
  success: boolean;
  payment_url?: string;
  payment_id?: string;
  error?: string;
}

interface PaymentVerification {
  success: boolean;
  status: 'pending' | 'completed' | 'failed';
  amount?: number;
  currency?: string;
  reference?: string;
  error?: string;
}

// Create payment request using IntaSend Express Check-out Link
export async function createPaymentRequest(paymentData: PaymentRequest): Promise<PaymentResponse> {
  if (!INTASEND_PUBLISHABLE_KEY) {
    return {
      success: false,
      error: 'Payment service not configured - missing publishable key'
    };
  }

  try {
    console.log('Creating Intasend payment request with publishable key:', INTASEND_PUBLISHABLE_KEY.substring(0, 10) + '...');
    console.log('Payment data:', paymentData);
    
    // Use the Express Check-out Link approach from IntaSend examples
    const response = await fetch(`${INTASEND_BASE_URL}/checkout/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        public_key: INTASEND_PUBLISHABLE_KEY,
        amount: paymentData.amount,
        currency: paymentData.currency,
        email: paymentData.email,
        first_name: paymentData.first_name,
        last_name: paymentData.last_name,
        phone: paymentData.phone,
        reference: paymentData.reference,
        callback_url: paymentData.callback_url || `${process.env.BASE_URL || 'http://localhost:5000'}/api/payment/callback`,
        redirect_url: `${process.env.BASE_URL || 'http://localhost:3000'}/payment/success`
      })
    });

    console.log('Intasend response status:', response.status);
    console.log('Intasend response headers:', response.headers);

    const responseText = await response.text();
    console.log('Intasend response text:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Intasend response as JSON:', parseError);
      return {
        success: false,
        error: `Invalid response from payment service: ${responseText.substring(0, 100)}`
      };
    }

    if (response.ok && data.url) {
      return {
        success: true,
        payment_url: data.url,
        payment_id: data.id || `checkout_${Date.now()}`
      };
    } else {
      return {
        success: false,
        error: data.message || data.error || 'Failed to create payment request'
      };
    }
  } catch (error) {
    console.error('Error creating payment request:', error);
    return {
      success: false,
      error: 'Payment service error'
    };
  }
}

// Verify payment status
export async function verifyPayment(paymentId: string): Promise<PaymentVerification> {
  if (!INTASEND_API_KEY) {
    return {
      success: false,
      status: 'failed',
      error: 'Payment service not configured'
    };
  }

  try {
    const response = await fetch(`${INTASEND_BASE_URL}/payment/collection/request/${paymentId}/`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${INTASEND_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok) {
      let status: 'pending' | 'completed' | 'failed' = 'pending';
      
      if (data.state === 'COMPLETED') {
        status = 'completed';
      } else if (data.state === 'FAILED' || data.state === 'CANCELLED') {
        status = 'failed';
      }

      return {
        success: true,
        status,
        amount: data.amount,
        currency: data.currency,
        reference: data.reference
      };
    } else {
      return {
        success: false,
        status: 'failed',
        error: data.message || 'Failed to verify payment'
      };
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return {
      success: false,
      status: 'failed',
      error: 'Payment verification error'
    };
  }
}

// Process withdrawal using IntaSend
export async function processWithdrawal(
  providerId: number,
  amount: number,
  bankDetails: {
    account_number: string;
    bank_code: string;
    account_name: string;
  }
): Promise<{ success: boolean; withdrawal_id?: string; error?: string }> {
  if (!INTASEND_API_KEY) {
    return {
      success: false,
      error: 'Payment service not configured'
    };
  }

  try {
    // Create bank transfer using IntaSend
    const response = await fetch(`${INTASEND_BASE_URL}/transfers/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${INTASEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount,
        currency: 'KES',
        account_number: bankDetails.account_number,
        bank_code: bankDetails.bank_code,
        account_name: bankDetails.account_name,
        reference: `Withdrawal-${providerId}-${Date.now()}`
      })
    });

    const data = await response.json();

    if (response.ok && data.state === 'PENDING') {
      return {
        success: true,
        withdrawal_id: data.id
      };
    } else {
      return {
        success: false,
        error: data.message || 'Failed to process withdrawal'
      };
    }
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return {
      success: false,
      error: 'Withdrawal processing error'
    };
  }
}

// Calculate withdrawal fee (IntaSend charges)
export function calculateWithdrawalFee(amount: number): { fee: number; netAmount: number } {
  // IntaSend charges 50 KES per transfer
  const fee = 50;
  const netAmount = amount - fee;
  
  return {
    fee,
    netAmount: Math.max(0, netAmount)
  };
}

// Get IntaSend publishable key for frontend
export function getPublishableKey(): string | null {
  return INTASEND_PUBLISHABLE_KEY || null;
}

// Log payment transaction (payment collected upfront)
export async function logPaymentTransaction(
  userId: number,
  amount: number,
  paymentId: string,
  status: string,
  reference: string,
  serviceId?: string,
  quantity: number = 20
): Promise<void> {
  try {
    const transactionData = {
      buyer_id: userId,
      service_id: serviceId ? parseInt(serviceId) : 0,
      quantity: quantity,
      total_cost: amount.toString(),
      comment_text: '',
      target_url: '',
      status: status === 'completed' ? 'completed' : 'pending',
      fulfilled_quantity: 0,
      payment_id: paymentId
    };

    await supabase.from('transactions').insert([transactionData]).select().single();
    
    // Note: Platform revenue is logged when service is verified, not when payment is collected
    // This ensures we only count revenue from actually delivered services
  } catch (error) {
    console.error('Error logging payment transaction:', error);
  }
}

// Log platform revenue when service is verified (provider gets paid)
export async function logPlatformRevenue(
  transactionId: number,
  quantity: number
): Promise<void> {
  try {
    // Calculate platform revenue (3 KES per quantity)
    const platformRevenue = 3.00 * quantity;
    
    // Log platform revenue
    await supabase.from('platform_revenue').insert([{
      transaction_id: transactionId,
      amount: platformRevenue.toString(),
      revenue_type: 'service_fee',
      description: `Platform fee from verified service (${quantity} units)`
    }]);
  } catch (error) {
    console.error('Error logging platform revenue:', error);
  }
} 