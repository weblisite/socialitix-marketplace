import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get user from authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token required' });
    }

    // Verify user with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const { amount, service_id, quantity, target_url, comment_text } = req.body;

    if (!amount || !service_id) {
      return res.status(400).json({ message: "Amount and service_id are required" });
    }

    // Validate minimum quantity
    const quantityNum = parseInt(quantity);
    if (quantityNum < 20) {
      return res.status(400).json({ message: "Minimum quantity required is 20" });
    }

    // Create payment using IntaSend
    const INTASEND_BASE_URL = 'https://api.intasend.com/api/v1';
    const INTASEND_PUBLISHABLE_KEY = process.env.INTASEND_API_PUBLISHABLE_KEY;

    const paymentData = {
      public_key: INTASEND_PUBLISHABLE_KEY,
      amount: amount,
      currency: 'KES',
      email: user.email,
      first_name: user.user_metadata?.full_name?.split(' ')[0] || 'User',
      last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || 'Name',
      phone_number: user.phone || '',
      redirect_url: `${process.env.BASE_URL || 'https://your-app.vercel.app'}/payment/success`,
      webhook_url: `${process.env.BASE_URL || 'https://your-app.vercel.app'}/api/payment/webhook`,
      metadata: {
        user_id: user.id,
        service_id: service_id,
        quantity: quantity,
        target_url: target_url,
        comment_text: comment_text
      }
    };

    const response = await fetch(`${INTASEND_BASE_URL}/checkout/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    const data = await response.json();

    if (response.ok && data.url) {
      // Log transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([
          {
            buyer_id: user.id,
            service_id: service_id,
            amount: amount,
            quantity: quantity,
            status: 'pending',
            payment_id: data.id || `checkout_${Date.now()}`,
            target_url: target_url,
            comment_text: comment_text
          }
        ]);

      if (transactionError) {
        console.error('Error logging transaction:', transactionError);
      }

      return res.status(200).json({
        success: true,
        payment_url: data.url,
        payment_id: data.id || `checkout_${Date.now()}`
      });
    } else {
      console.error('IntaSend error:', data);
      return res.status(500).json({ 
        message: "Failed to create payment", 
        error: data.message || 'Payment creation failed' 
      });
    }
  } catch (error) {
    console.error('Error in payment creation:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 