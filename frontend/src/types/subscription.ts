export interface Subscription {
  id: string;
  customer_id: string;
  program_id: string;
  start_date: string;
  last_redeemed_at?: string;
  remaining_quota: number;
  expires_at: string;
  status: 'active' | 'redeemed' | 'expired';
} 