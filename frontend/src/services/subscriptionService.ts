import supabase from '../utils/supabase';
import type { Subscription } from '../types/subscription';

export async function getSubscriptionsByCustomerIdWithDetails(customerId: string) {
  // Try to join subscription_programs and merchants if FK exists
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, subscription_programs(*, merchants(*))')
    .eq('customer_id', customerId);
  if (error) throw error;
  return data;
} 