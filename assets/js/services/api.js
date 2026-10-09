import { BVROS_CONFIG } from '../config.js';

export async function bvrosFunction(name, body) {
  const response = await fetch(`${BVROS_CONFIG.supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: BVROS_CONFIG.supabaseAnonKey,
      Authorization: `Bearer ${BVROS_CONFIG.supabaseAnonKey}`
    },
    body: JSON.stringify(body),
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
