import supabase from '../utils/supabase';
import type { Customer } from '../types/customer';

export async function getCustomerByWallet(wallet_address: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('wallet_address', wallet_address)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116: No rows found
  return data as Customer;
}

export async function createCustomer(customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert([customer])
    .select()
    .single();
  if (error) throw error;
  return data as Customer;
} 