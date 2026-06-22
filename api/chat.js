// api/chat.js - Vercel Edge Function with Upstash Redis Cache
// 雲端快取層，大幅提升速度並降低 API 成本
/* global process */

import OpenAI from 'openai';
import {
  getCorsHeaders,
  jsonResponse,
  methodNotAllowedResponse,
  parseJsonBody,
} from './_shared/security.js';

const MAX_QUESTION_LENGTH = 800;
const CACHE_TTL_SECONDS = 24 * 60 * 60;
const ASSISTANT_UNAVAILABLE_MESSAGE = '目前知識庫服務暫時無法回覆，請稍後再試。若您有胸痛、呼吸困難、昏倒、意識改變、無尿、嚴重水腫、吐血或黑便等急迫症狀，請立即聯絡主治醫師、前往急診，或撥打 119。';
const RATE_LIMIT_MESSAGE = '請求過於頻繁，請稍後再試。若您有急迫症狀，請立即聯絡主治醫師、前往急診，或撥打 119。';
const RED_FLAG_MESSAGE = '您描述的情況可能需要即時醫療評估。請立即聯絡主治醫師、前往急診，或有急迫症狀時撥打 119。本系統無法取代急症評估。';
const RED_FLAG_PATTERNS = [
  /胸痛|胸悶.*冒冷汗|冒冷汗.*胸悶/,
  /呼吸困難|喘不過氣|喘到不能說話|嚴重喘/,
  /意識改變|意識不清|昏倒|暈倒|失去意識|抽搐|癲癇/,
  /少尿|無尿|尿不出來/,
  /嚴重水腫|全身水腫|肺水腫/,
  /血鉀過高|高血鉀|hyperkalemia/i,
  /心悸|心跳很亂|心律不整/,
  /黑便|吐血|咳血|血便/,
  /嚴重低血壓|血壓很低|休克/,
];

// Edge Runtime 配置
export const config = {
  runtime: 'edge',
  maxDuration: 30, // 最長執行時間 30 秒（Pro 方案限制）
};

/**
 * Upstash Redis REST API Helper
 */
class UpstashCache {
  constructor(url, token) {
    this.url = url;
    this.token = token;
  }

  async get(key) {
    try {
      const response = await fetch(`${this.url}/get/${key}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        console.error('Upstash GET failed:', response.status);
        return null;
      }

      const data = await response.json();
      // Upstash 回傳 { result: "..." } 或 { result: null }
      if (data.result === null) {
        return null;
      }

      // 解析 JSON 字串
      let parsed = JSON.parse(data.result);

      // 容錯：如果是雙重序列化的舊快取（字串而非物件），再解析一次
      if (typeof parsed === 'string') {
        console.warn('⚠️ 偵測到舊格式快取，嘗試修復...');
        parsed = JSON.parse(parsed);
      }

      // 驗證快取格式
      if (!parsed || typeof parsed !== 'object' || !parsed.reply) {
        console.warn('⚠️ 快取格式無效，忽略');
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('Upstash GET error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 604800) {
    try {
      // 將值序列化為 JSON
      const jsonValue = JSON.stringify(value);

      // 使用 SETEX 命令（SET with EXpire）
      const response = await fetch(`${this.url}/setex/${key}/${ttl}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
        body: jsonValue,  // 直接傳遞 JSON 字串，不需要再包一層
      });

      if (!response.ok) {
        console.error('Upstash SET failed:', response.status);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Upstash SET error:', error);
      return false;
    }
  }
}

/**
 * 生成快取鍵（使用 SHA-256 hash）
 */
async function generateCacheKey(question) {
  const normalized = question.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `qa:${hashHex.slice(0, 32)}`;
}

function containsRedFlag(question) {
  return RED_FLAG_PATTERNS.some(pattern => pattern.test(question));
}

export function getAssistantId() {
  return process.env.ASSISTANT_ID || process.env.VITE_ASSISTANT_ID;
}

export async function retrieveRunStatus(client, threadId, runId) {
  return client.beta.threads.runs.retrieve(runId, { thread_id: threadId });
}

/**
 * 調用 Assistants API（穩定版 polling，快速間隔）
 */
async function callAssistantAPI(question, apiKey, assistantId) {
  const client = new OpenAI({ apiKey });

  // 1. 建立 Thread + 加入訊息 + 執行（合併減少延遲）
  const thread = await client.beta.threads.create();
  await client.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: question
  });
  const run = await client.beta.threads.runs.create(thread.id, {
    assistant_id: assistantId
  });

  // 2. 快速 polling（前 5 次 300ms，之後 800ms，最多 25 秒）
  let attempts = 0;
  const maxAttempts = 35;

  while (attempts < maxAttempts) {
    const delay = attempts < 5 ? 300 : 800;
    await new Promise(resolve => setTimeout(resolve, delay));

    const runStatus = await retrieveRunStatus(client, thread.id, run.id);

    if (runStatus.status === 'completed') {
      const messages = await client.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find(
        msg => msg.role === 'assistant' && msg.run_id === run.id
      );
      if (!assistantMessage) throw new Error('無法取得 Assistant 回覆');

      const reply = assistantMessage.content[0].text.value;
      const annotations = assistantMessage.content[0].text.annotations || [];
      const confidence = annotations.length > 0 ? 'high' : 'medium';
      return { reply, confidence, sources: annotations };
    }

    if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
      throw new Error(`Run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
    }

    attempts++;
  }

  throw new Error('Run timeout');
}

/**
 * Rate limiting: 20 requests per minute per IP
 */
async function checkRateLimit(cache, ip) {
  if (!cache) return true; // local/dev fallback when Redis is not configured
  const key = `ratelimit:${ip}`;
  try {
    const response = await fetch(`${cache.url}/incr/${key}`, {
      headers: { 'Authorization': `Bearer ${cache.token}` },
    });
    const data = await response.json();
    const count = data.result;

    if (count === 1) {
      // First request, set expiry to 60 seconds
      await fetch(`${cache.url}/expire/${key}/60`, {
        headers: { 'Authorization': `Bearer ${cache.token}` },
      });
    }

    return count <= 20;
  } catch (e) {
    console.warn('Rate limit check failed:', e);
    return true;
  }
}

/**
 * 主處理函式
 */
export default async function handler(request) {
  // CORS headers
  const corsHeaders = getCorsHeaders(request, ['POST']);

  // 處理 OPTIONS 請求（CORS preflight）
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (request.method !== 'POST') {
      return methodNotAllowedResponse(['POST'], corsHeaders);
    }

    // 1. 初始化 Upstash Redis
    const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
    const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!UPSTASH_URL || !UPSTASH_TOKEN) {
      console.warn('⚠️ Upstash 未設定，快取功能將被停用');
    }

    const cache = (UPSTASH_URL && UPSTASH_TOKEN)
      ? new UpstashCache(UPSTASH_URL, UPSTASH_TOKEN)
      : null;

    // 2. 解析請求
    const { data: payload, error: parseError } = await parseJsonBody(request);
    if (parseError) {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, corsHeaders);
    }

    const { question } = payload;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return jsonResponse({ error: 'Invalid question' }, 400, corsHeaders);
    }

    const trimmedQuestion = question.trim();

    if (trimmedQuestion.length > MAX_QUESTION_LENGTH) {
      return jsonResponse({ error: `Question too long (max ${MAX_QUESTION_LENGTH} characters)` }, 400, corsHeaders);
    }

    if (containsRedFlag(trimmedQuestion)) {
      return jsonResponse({
        reply: RED_FLAG_MESSAGE,
        confidence: 'safety',
        sources: [],
        fromCache: false,
      }, 200, corsHeaders, { 'X-Safety-Guard': 'red-flag' });
    }

    // Rate limiting. Red-flag safety guidance is returned before this guard.
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (cache) {
      const allowed = await checkRateLimit(cache, clientIP);
      if (!allowed) {
        return jsonResponse({
          error: 'Rate limit exceeded',
          reply: RATE_LIMIT_MESSAGE,
          confidence: 'unavailable',
          sources: [],
          fromCache: false,
        }, 429, corsHeaders);
      }
    }

    // 3. 生成快取鍵
    const cacheKey = await generateCacheKey(trimmedQuestion);
    console.log(`🔍 查詢快取: ${cacheKey}`);

    // 4. 檢查快取（如果已設定）
    let cached = null;
    if (cache) {
      cached = await cache.get(cacheKey);
    }

    if (cached) {
      console.log('✅ 快取命中！');
      return new Response(
        JSON.stringify({
          ...cached,
          fromCache: true,
          cacheAge: Math.floor((Date.now() - cached.timestamp) / 1000) // 秒
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-Cache': 'HIT'
          }
        }
      );
    }

    console.log('❌ 快取未命中，調用 API');

    // 5. 從環境變數取得設定（後端專用，不會暴露到前端）
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    const ASSISTANT_ID = getAssistantId();

    // 6. 調用 AI（僅 Assistants API；失敗時不降級為一般醫療建議）
    let result;

    try {
      if (!OPENAI_KEY) {
        throw new Error('OpenAI API Key not configured');
      }

      if (ASSISTANT_ID && ASSISTANT_ID.startsWith('asst_')) {
        console.log('📚 使用 Assistants API');
        result = await callAssistantAPI(trimmedQuestion, OPENAI_KEY, ASSISTANT_ID);

        // 標記知識庫來源
        if (result.confidence === 'high' && result.sources.length > 0) {
          result.reply = `✓ *此回答基於專業知識庫*\n\n${result.reply}`;
        }
      } else {
        throw new Error('Assistant ID not configured');
      }
    } catch (error) {
      console.warn('⚠️ Assistants API 失敗:', error.message);
      return jsonResponse({
        error: 'Knowledge base unavailable',
        reply: ASSISTANT_UNAVAILABLE_MESSAGE,
        confidence: 'unavailable',
        sources: [],
        fromCache: false,
      }, 503, corsHeaders);
    }

    // 7. 存入快取（24 小時過期；不保存原始醫療問題）
    const cacheData = {
      ...result,
      timestamp: Date.now(),
    };

    if (cache) {
      await cache.set(cacheKey, cacheData, CACHE_TTL_SECONDS);
      console.log('💾 已存入快取（24小時有效期）');
    } else {
      console.log('⚠️ 快取未啟用，跳過快取存儲');
    }

    // 8. 回傳結果
    return new Response(
      JSON.stringify({ ...result, fromCache: false }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Cache': 'MISS'
        }
      }
    );

  } catch (error) {
    console.error('❌ API 錯誤:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        fromCache: false
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
