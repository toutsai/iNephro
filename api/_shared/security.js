/* global process */

const DEFAULT_ALLOWED_ORIGINS = [
  'https://i-nephro.vercel.app',
  'https://inephro.vercel.app',
];
const LOCAL_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
];

export function getAllowedOrigins() {
  return new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...(process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean),
  ]);
}

export function getCorsHeaders(request, methods) {
  const origin = request.headers?.get('origin') || '';
  const isAllowed = getAllowedOrigins().has(origin) ||
    LOCAL_ORIGIN_PATTERNS.some(pattern => pattern.test(origin));

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': [...methods, 'OPTIONS'].join(', '),
    'Access-Control-Allow-Headers': 'Content-Type',
    ...(isAllowed ? { 'Vary': 'Origin' } : {}),
  };
}

export function jsonResponse(body, status, corsHeaders, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

export function methodNotAllowedResponse(methods, corsHeaders) {
  return jsonResponse(
    { error: 'Method not allowed' },
    405,
    corsHeaders,
    { Allow: [...methods, 'OPTIONS'].join(', ') }
  );
}

export async function parseJsonBody(request) {
  try {
    return { data: await request.json(), error: null };
  } catch {
    return { data: null, error: 'Invalid JSON body' };
  }
}
