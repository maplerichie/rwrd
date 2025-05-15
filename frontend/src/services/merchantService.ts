import supabase from '../utils/supabase';
import type { Merchant } from '../types/merchant';

export async function getMerchantByWallet(wallet_address: string): Promise<Merchant | null> {
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('wallet_address', wallet_address)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116: No rows found
  return data as Merchant;
}

export async function createMerchant(merchant: Omit<Merchant, 'id' | 'created_at'>): Promise<Merchant> {
  const { data, error } = await supabase
    .from('merchants')
    .insert([merchant])
    .select()
    .single();
  if (error) throw error;
  return data as Merchant;
}

export async function updateMerchant(id: string, updates: Partial<Omit<Merchant, 'id' | 'created_at'>>): Promise<Merchant> {
  const { data, error } = await supabase
    .from('merchants')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Merchant;
} 