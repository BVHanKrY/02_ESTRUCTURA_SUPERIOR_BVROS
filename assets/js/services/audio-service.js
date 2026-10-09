import { BVROS_CONFIG } from '../config.js';

function assertConfigured() {
  if (
    !BVROS_CONFIG.supabaseUrl.startsWith('https://') ||
    BVROS_CONFIG.supabaseUrl.includes('PEGA_AQUI')
  ) {
    throw new Error('Configura supabaseUrl en assets/js/config.js');
  }

  if (
    !BVROS_CONFIG.supabaseAnonKey ||
    BVROS_CONFIG.supabaseAnonKey.includes('PEGA_AQUI')
  ) {
    throw new Error(
      'Configura la clave publicable en assets/js/config.js'
    );
  }
}

export async function ensureSecureAudioSource(audioElement) {
  if (
    !audioElement ||
    audioElement.dataset.secureAudio !== 'true'
  ) {
    return audioElement?.src || '';
  }

  const expiresAt = Number(
    audioElement.dataset.signedExpiresAt || 0
  );

  if (
    audioElement.src &&
    expiresAt >
      Date.now() +
        BVROS_CONFIG.signedUrlRefreshMarginMs
  ) {
    return audioElement.src;
  }

  assertConfigured();

  const trackId = audioElement.dataset.trackId;

  if (!trackId) {
    throw new Error('La pista no tiene data-track-id');
  }

  const endpoint =
    `${BVROS_CONFIG.supabaseUrl}/functions/v1/${BVROS_CONFIG.audioFunctionName}`;

  const response = await fetch(endpoint, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
      'apikey': BVROS_CONFIG.supabaseAnonKey
    },

    body: JSON.stringify({ trackId }),

    cache: 'no-store'
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      `No se pudo autorizar el audio (${response.status}): ${message}`
    );
  }

  const payload = await response.json();

  if (!payload.signedUrl) {
    throw new Error(
      'La función no devolvió signedUrl'
    );
  }

  audioElement.src = payload.signedUrl;

  audioElement.dataset.signedExpiresAt =
    String(
      Date.now() +
      (payload.expiresIn || 90) * 1000
    );

  audioElement.load();

  return payload.signedUrl;
}