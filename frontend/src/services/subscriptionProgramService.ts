import supabase from '../utils/supabase';
import type { SubscriptionProgram } from '../types/subscriptionProgram';

export async function getSubscriptionPrograms(): Promise<SubscriptionProgram[]> {
  const { data, error } = await supabase
    .from('subscription_programs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as SubscriptionProgram[];
}

export async function getSubscriptionProgramById(id: string): Promise<SubscriptionProgram | null> {
  const { data, error } = await supabase
    .from('subscription_programs')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as SubscriptionProgram;
}

export async function createSubscriptionProgram(program: Omit<SubscriptionProgram, 'id' | 'created_at'>): Promise<SubscriptionProgram> {
  const { data, error } = await supabase
    .from('subscription_programs')
    .insert([program])
    .select()
    .single();
  if (error) throw error;
  return data as SubscriptionProgram;
}

export async function updateSubscriptionProgram(id: string, updates: Partial<Omit<SubscriptionProgram, 'id' | 'created_at'>>): Promise<SubscriptionProgram> {
  const { data, error } = await supabase
    .from('subscription_programs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as SubscriptionProgram;
}

export async function deleteSubscriptionProgram(id: string): Promise<void> {
  const { error } = await supabase
    .from('subscription_programs')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function getSubscriptionProgramsByMerchantId(merchant_id: string): Promise<SubscriptionProgram[]> {
  const { data, error } = await supabase
    .from('subscription_programs')
    .select('*')
    .eq('merchant_id', merchant_id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as SubscriptionProgram[];
} 