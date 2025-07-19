declare global {
  interface Window {
    PaystackPop: any;
  }
}

export interface PaystackConfig {
  key: string;
  email: string;
  amount: number;
  currency?: string;
  ref?: string;
  metadata?: any;
  callback: (response: any) => void;
  onClose: () => void;
}

export function initializePayment(config: PaystackConfig) {
  if (!window.PaystackPop) {
    throw new Error('Paystack script not loaded');
  }

  const handler = window.PaystackPop.setup({
    ...config,
    currency: config.currency || 'KES',
  });

  handler.openIframe();
}

export function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Paystack script'));
    document.head.appendChild(script);
  });
}

export function calculateWithdrawalFee(amount: number): { fee: number; netAmount: number } {
  const fee = (amount * 0.029) + 30;
  const netAmount = amount - fee;
  return { fee, netAmount };
}
