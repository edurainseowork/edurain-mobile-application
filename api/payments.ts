import { apiFetch } from './client';

export interface RazorpayOrderResponse {
  success: boolean;
  free?: boolean;
  orderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  courseTitle?: string;
  plan?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  courseId?: number;
}

export interface RazorpayVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  courseId: number;
}

export async function createRazorpayOrder(
  courseId: number,
  couponCode?: string,
  plan: string = 'basic'
): Promise<RazorpayOrderResponse> {
  const res = await apiFetch<RazorpayOrderResponse>('/api/razorpay/order', {
    method: 'POST',
    body: JSON.stringify({
      courseId,
      couponCode: couponCode ? couponCode.trim().toUpperCase() : undefined,
      plan,
    }),
  });
  return res;
}

export async function verifyRazorpayPayment(
  payload: RazorpayVerifyPayload
): Promise<{ success: boolean; message?: string }> {
  const res = await apiFetch<{ success: boolean; message?: string }>('/api/razorpay/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res;
}

export async function verifyGooglePlayPurchase(params: {
  courseId: number;
  productId: string;
  purchaseToken: string;
}): Promise<{ success: boolean; message?: string }> {
  const res = await apiFetch<{ success: boolean; message?: string }>('/api/google-play/verify', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return res;
}

export async function verifyAppleIapPurchase(params: {
  courseId: number;
  productId: string;
  transactionId: string;
  receiptData?: string;
}): Promise<{ success: boolean; message?: string }> {
  const res = await apiFetch<{ success: boolean; message?: string }>('/api/apple-iap/verify', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return res;
}


