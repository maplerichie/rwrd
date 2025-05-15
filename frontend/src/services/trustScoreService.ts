import { getMerchantByWallet } from './merchantService';
import supabase from '../utils/supabase';
import type { Merchant } from '../types/merchant';
import type { Borrowing } from '../types/borrowing';

// Fetch borrow history for a merchant by merchant_id
export async function getBorrowHistoryByMerchantId(merchant_id: string): Promise<Borrowing[]> {
  const { data, error } = await supabase
    .from('borrowings')
    .select('*')
    .eq('merchant_id', merchant_id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Borrowing[];
}

// Calculate trust score based on merchant and borrow history
export function updateTrustScore(merchant: Merchant, borrowHistory: Borrowing[]): number {
  let score = 3;
  if (merchant.revenue && merchant.revenue > 10000) score += 1;
  const repays = borrowHistory.filter(b => b.type === 'repay').length;
  if (repays > 5) score += 1;
  return Math.max(1, Math.min(10, score));
}

// Calculate APR based on trust score
export function getAPR(trust_score: number): number {
  switch (trust_score) {
    case 5: return 8;
    case 4: return 10;
    case 3: return 12;
    case 2: return 15;
    case 1: return 20;
    default: return 15;
  }
}

// Calculate debt from borrow history
export function getDebt(borrowHistory: Borrowing[]): number {
  return borrowHistory.filter(h => h.type === 'borrow' || h.type === 'penalty').reduce((sum, h) => sum + h.amount, 0) - borrowHistory.filter(h => h.type === 'repay').reduce((sum, h) => sum + h.amount, 0);
}

// Generate warning message based on merchant and borrow history
export function getWarning(merchant: Merchant, borrowHistory: Borrowing[]): string | null {
  const trust_score = merchant.trust_score ?? 3;
  const revenue = merchant.revenue ?? 0;
  const borrowLimit = revenue * (trust_score * 0.1);
  const borrowed = getDebt(borrowHistory);
  if (trust_score <= 2) {
    return 'Warning: Low trust score. Your borrow limit and rates are less favorable.';
  }
  if (borrowed > 0.9 * borrowLimit) {
    return 'Warning: You are close to your borrow limit.';
  }
  if (borrowed > borrowLimit) {
    return 'Warning: You have exceeded your borrowable limit. Penalties may apply.';
  }
  return null;
}

// Remove in-memory simulation functions and state 