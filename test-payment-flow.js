// Test script for payment and order creation flow
// Run this with: node test-payment-flow.js

const BASE_URL = 'http://localhost:5000';

async function testPaymentFlow() {
  console.log('🧪 Testing Payment and Order Creation Flow\n');

  try {
    // Step 1: Create a payment
    console.log('1️⃣ Creating payment...');
    const paymentResponse = await fetch(`${BASE_URL}/api/payment/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      },
      body: JSON.stringify({
        amount: 10.00,
        service_id: '15', // Replace with actual service ID
        quantity: 1,
        target_url: 'https://example.com',
        comment_text: 'Test comment'
      })
    });

    const paymentData = await paymentResponse.json();
    console.log('Payment creation response:', paymentData);

    if (!paymentData.success) {
      throw new Error(`Payment creation failed: ${paymentData.message}`);
    }

    const paymentId = paymentData.payment_id;
    console.log(`✅ Payment created with ID: ${paymentId}\n`);

    // Step 2: Check transaction status
    console.log('2️⃣ Checking transaction status...');
    const transactionResponse = await fetch(`${BASE_URL}/api/test/transaction/1`, {
      method: 'GET'
    });

    const transactionData = await transactionResponse.json();
    console.log('Transaction status:', transactionData);

    // Step 3: Manually trigger webhook for completed payment
    console.log('3️⃣ Triggering webhook for completed payment...');
    const webhookResponse = await fetch(`${BASE_URL}/api/test/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        payment_id: paymentId,
        state: 'COMPLETED',
        event_type: 'collection'
      })
    });

    const webhookData = await webhookResponse.json();
    console.log('Webhook response:', webhookData);

    if (webhookData.success) {
      console.log('✅ Webhook processed successfully\n');
    } else {
      throw new Error(`Webhook processing failed: ${webhookData.message}`);
    }

    // Step 4: Check if assignments were created
    console.log('4️⃣ Checking if assignments were created...');
    const assignmentsResponse = await fetch(`${BASE_URL}/api/test/create-assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transaction_id: 1 // Replace with actual transaction ID
      })
    });

    const assignmentsData = await assignmentsResponse.json();
    console.log('Assignments creation response:', assignmentsData);

    console.log('\n🎉 Payment flow test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPaymentFlow(); 