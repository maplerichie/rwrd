export interface Merchant {
  id: string;
  name: string;
  email: string;
  wallet_address: string;
  trust_score?: number; // 1-5
  revenue?: number;
  created_at: string;
} 