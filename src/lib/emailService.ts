import emailjs from '@emailjs/browser';

// EmailJS config — replace these with your own from https://www.emailjs.com
// Service ID: from EmailJS dashboard → Email Services
// Template ID: from EmailJS dashboard → Email Templates
// Public Key: from EmailJS dashboard → Account → Public Key
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

export interface BillEmailParams {
  toEmail: string;
  tableId: string;
  orderId: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  paymentMethod: string;
  orderTime: string;
}

export async function sendBillEmail(params: BillEmailParams): Promise<void> {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    throw new Error('EmailJS is not configured. Please add VITE_EMAILJS_* keys to .env.local');
  }

  const itemsText = params.items
    .map((i) => `${i.name} x${i.quantity} — ₹${(i.price * i.quantity).toLocaleString('en-IN')}`)
    .join('\n');

  await emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      to_email: params.toEmail,
      table_id: params.tableId,
      order_id: params.orderId,
      items_list: itemsText,
      total_amount: `₹${params.total.toLocaleString('en-IN')}`,
      payment_method: params.paymentMethod === 'cash' ? 'Cash on Delivery' : 'Online Payment',
      order_time: params.orderTime,
    },
    PUBLIC_KEY
  );
}

export const isEmailConfigured = !!(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);
