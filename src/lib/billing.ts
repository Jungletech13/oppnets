import { supabase } from './supabase';

export async function startCheckout(priceKey: string, quantity = 1) {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { priceKey, quantity },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error('Stripe did not return a checkout page.');
  window.location.assign(data.url);
}

