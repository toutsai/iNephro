import { describe, expect, it, vi, afterEach } from 'vitest';
import chatHandler, { getAssistantId, getCacheTtlSeconds, retrieveRunStatus } from '../../api/chat.js';
import nutritionHandler from '../../api/nutrition.js';
import ttsGoogleHandler from '../../api/tts-google.js';

const assistantMock = vi.hoisted(() => ({
  reply: '這是知識庫測試回覆。',
  annotations: [{ type: 'file_citation', text: 'citation' }],
  status: 'completed',
  lastError: null,
}));

vi.mock('openai', () => ({
  default: vi.fn(function OpenAI() {
    return {
      beta: {
        threads: {
          create: vi.fn(async () => ({ id: 'thread_test' })),
          messages: {
            create: vi.fn(async () => ({ id: 'message_test' })),
            list: vi.fn(async () => ({
              data: [{
                role: 'assistant',
                run_id: 'run_test',
                content: [{
                  text: {
                    value: assistantMock.reply,
                    annotations: assistantMock.annotations,
                  },
                }],
              }],
            })),
          },
          runs: {
            create: vi.fn(async () => ({ id: 'run_test' })),
            retrieve: vi.fn(async () => ({
              status: assistantMock.status,
              last_error: assistantMock.lastError,
            })),
          },
        },
      },
    };
  }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  assistantMock.reply = '這是知識庫測試回覆。';
  assistantMock.annotations = [{ type: 'file_citation', text: 'citation' }];
  assistantMock.status = 'completed';
  assistantMock.lastError = null;
});

describe('chat API safety guards', () => {
  it('supports the legacy VITE_ASSISTANT_ID deployment variable', () => {
    vi.stubEnv('VITE_ASSISTANT_ID', 'asst_legacy');

    expect(getAssistantId()).toBe('asst_legacy');
  });

  it('prefers ASSISTANT_ID over the legacy VITE_ASSISTANT_ID variable', () => {
    vi.stubEnv('ASSISTANT_ID', 'asst_server');
    vi.stubEnv('VITE_ASSISTANT_ID', 'asst_legacy');

    expect(getAssistantId()).toBe('asst_server');
  });

  it('retrieves Assistant runs with the current OpenAI SDK parameter order', async () => {
    const retrieve = vi.fn(async () => ({ status: 'completed' }));
    const client = {
      beta: {
        threads: {
          runs: { retrieve },
        },
      },
    };

    await retrieveRunStatus(client, 'thread_123', 'run_456');

    expect(retrieve).toHaveBeenCalledWith('run_456', { thread_id: 'thread_123' });
  });

  it('keeps hot nephrology topics cached longer than one-off questions', () => {
    expect(getCacheTtlSeconds('請說明慢性腎臟病(CKD)的五個分期是什麼？')).toBe(30 * 24 * 60 * 60);
    expect(getCacheTtlSeconds('今天早餐可以吃什麼？')).toBe(24 * 60 * 60);
  });

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

  it('allows the production hyphenated origin', async () => {
    const response = await chatHandler(new Request('https://i-nephro.vercel.app/api/chat', {
      method: 'OPTIONS',
      headers: { origin: 'https://i-nephro.vercel.app' },
    }));

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://i-nephro.vercel.app');
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

  it('fails open when the rate limit backend is unavailable', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example.com');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token');
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('Redis unavailable');
    }));

    const response = await chatHandler(new Request('https://i-nephro.vercel.app/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'https://i-nephro.vercel.app',
        'x-forwarded-for': '203.0.113.10',
      },
      body: JSON.stringify({ question: '腎臟病可以吃什麼水果？' }),
    }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe('Knowledge base unavailable');
    expect(body.reply).toContain('知識庫服務暫時無法回覆');
  });

  it('returns a displayable message when the rate limit is exceeded', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example.com');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ result: 21 }))));

    const response = await chatHandler(new Request('https://i-nephro.vercel.app/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'https://i-nephro.vercel.app',
        'x-forwarded-for': '203.0.113.10',
      },
      body: JSON.stringify({ question: '腎臟病可以吃什麼水果？' }),
    }));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.reply).toContain('請求過於頻繁');
    expect(body.confidence).toBe('unavailable');
  });
});

describe('chat API smoke coverage', () => {
  const postChat = (question) => chatHandler(new Request('https://i-nephro.vercel.app/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin: 'https://i-nephro.vercel.app',
      'x-forwarded-for': '203.0.113.20',
    },
    body: JSON.stringify({ question }),
  }));

  it.each([
    ['general question', '什麼是蛋白尿？'],
    ['AKI topic', '請簡單介紹急性腎損傷(AKI)的定義與常見原因。'],
    ['CKD topic', '請說明慢性腎臟病(CKD)的五個分期是什麼？'],
    ['hemodialysis topic', '請詳細介紹血液透析（洗腎）的原理、流程、注意事項與照護重點。'],
    ['peritoneal dialysis topic', '請說明腹膜透析的原理、優缺點、操作方式與居家照護注意事項。'],
  ])('returns a knowledge-base response for %s', async (_caseName, question) => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    vi.stubEnv('ASSISTANT_ID', 'asst_test');

    const response = await postChat(question);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reply).toContain('此回答基於專業知識庫');
    expect(body.reply).toContain('這是知識庫測試回覆');
    expect(body.confidence).toBe('high');
    expect(body.sources).toHaveLength(1);
    expect(response.headers.get('Server-Timing')).toContain('total_ms');
  });

  it('keeps red-flag questions on the safety path', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    vi.stubEnv('ASSISTANT_ID', 'asst_test');

    const response = await postChat('我胸痛喘不過氣');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Safety-Guard')).toBe('red-flag');
    expect(body.confidence).toBe('safety');
    expect(body.reply).toContain('急診');
    expect(body.reply).toContain('119');
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
