import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const expiresIn = 90;
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || 'http://localhost:8000,https://bvhankry.onrender.com')
  .split(',').map((value) => value.trim()).filter(Boolean);

function corsHeaders(origin: string | null) {
  const allowed = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Cache-Control': 'no-store'
  };
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  const headers = corsHeaders(origin);
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers });
  if (origin && !allowedOrigins.includes(origin)) return new Response('Origin not allowed', { status: 403, headers });

  try {
    const { trackId } = await request.json();
    if (typeof trackId !== 'string' || !/^BVROS-TRK-[A-Z0-9-]+$/.test(trackId)) {
      return new Response('Invalid trackId', { status: 400, headers });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Server secrets are missing');

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: track, error: trackError } = await admin
      .from('tracks')
      .select('id, status')
      .eq('public_id', trackId)
      .eq('status', 'published')
      .maybeSingle();
    if (trackError) throw trackError;
    if (!track) return new Response('Track not found', { status: 404, headers });

    const { data: asset, error: assetError } = await admin
      .from('track_assets')
      .select('bucket_name, object_path')
      .eq('track_id', track.id)
      .eq('kind', 'stream')
      .eq('active', true)
      .maybeSingle();
    if (assetError) throw assetError;
    if (!asset) return new Response('Stream asset not configured', { status: 404, headers });

    const { data: signed, error: signError } = await admin.storage
      .from(asset.bucket_name)
      .createSignedUrl(asset.object_path, expiresIn, { download: false });
    if (signError) throw signError;

    return Response.json({ signedUrl: signed.signedUrl, expiresIn }, { headers });
  } catch (error) {
    console.error(error);
    return new Response('Internal error', { status: 500, headers });
  }
});
