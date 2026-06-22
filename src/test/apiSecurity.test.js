import { describe, expect, it, vi, afterEach } from 'vitest';
import chatHandler from '../../api/chat.js';
import nutritionHandler from '../../api/nutrition.js';
import ttsGoogleHandler from '../../api/tts-google.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('chat API safety guards', () => {
  it('blocks red-flag symptoms before calling external services', async () => {
    const response = await chatHandler(new Request('https://inephro.vercel.app/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin: 'https://inephro.vercel.app' },
      body: JSON.stringify({ question: '我現在胸痛又冒冷汗，該怎麼辦？' }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Safety-Guard')).toBe('red-flag');
    expect(body.fromCache).toBe(false);
    expect(body.reply).toContain('急診');
    expect(body.reply).toContain('119');
  });

  it('rejects unsupported methods', async () => {
    const response = await chatHandler(new Request('https://inephro.vercel.app/api/chat', {
      method: 'DELETE',
      headers: { origin: 'https://inephro.vercel.app' },
    }));

    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('POST, OPTIONS');
  });

  it('rejects overlong questions', async () => {
    const response = await chatHandler(new Request('https://inephro.vercel.app/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin: 'https://inephro.vercel.app' },
      body: JSON.stringify({ question: 'a'.repeat(801) }),
    }));

    expect(response.status).toBe(400);
  });

  it('does not allow arbitrary vercel preview origins by default', async () => {
    const response = await chatHandler(new Request('https://inephro.vercel.app/api/chat', {
      method: 'OPTIONS',
      headers: { origin: 'https://random-project.vercel.app' },
    }));

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('');
  });
});

describe('TTS API guards', () => {
  it('rejects overlong text', async () => {
    const response = await ttsGoogleHandler(new Request('https://inephro.vercel.app/api/tts-google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin: 'https://inephro.vercel.app' },
      body: JSON.stringify({ text: 'a'.repeat(1201) }),
    }));

    expect(response.status).toBe(400);
  });
});

describe('nutrition API guards', () => {
  it('rejects unsupported methods', async () => {
    const response = await nutritionHandler(new Request('https://inephro.vercel.app/api/nutrition?q=香蕉', {
      method: 'POST',
      headers: { origin: 'https://inephro.vercel.app' },
    }));

    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET, OPTIONS');
  });

  it('caps limit parameter', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      foods: Array.from({ length: 30 }, (_, index) => ({
        name: `香蕉${index}`,
        category: '水果',
        potassium: 100,
        phosphorus: 10,
        sodium: 5,
      })),
      source: 'test',
      note: 'test',
    }), { status: 200 })));

    const response = await nutritionHandler(new Request('https://inephro.vercel.app/api/nutrition?q=香蕉&limit=9999', {
      method: 'GET',
      headers: { origin: 'https://inephro.vercel.app' },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results).toHaveLength(20);
  });
});
