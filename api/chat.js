// api/chat.js - Vercel Edge Function with Upstash Redis Cache
// 雲端快取層，大幅提升速度並降低 API 成本

import OpenAI from 'openai';

// Edge Runtime 配置
export const config = {
  runtime: 'edge',
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

/**
 * 調用 Assistants API
 */
async function callAssistantAPI(question, apiKey, assistantId) {
  const client = new OpenAI({ apiKey });

  // 1. 建立 Thread
  const thread = await client.beta.threads.create();

  // 2. 加入訊息
  await client.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: question
  });

  // 3. 執行 Assistant
  const run = await client.beta.threads.runs.create(thread.id, {
    assistant_id: assistantId
  });

  // 4. 等待完成（使用 REST API 避免 SDK 問題）
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    const response = await fetch(
      `https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      }
    );

    const runStatus = await response.json();

    if (runStatus.status === 'completed') {
      // 5. 取得回覆
      const messages = await client.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find(
        msg => msg.role === 'assistant' && msg.run_id === run.id
      );

      if (!assistantMessage) {
        throw new Error('無法取得 Assistant 回覆');
      }

      const reply = assistantMessage.content[0].text.value;
      const annotations = assistantMessage.content[0].text.annotations || [];
      const confidence = annotations.length > 0 ? 'high' : 'medium';

      return { reply, confidence, sources: annotations };
    }

    if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
      throw new Error(`Run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
  }

  throw new Error('Run timeout');
}

/**
 * 降級到 ChatGPT API
 */
async function fallbackToChatGPT(question, apiKey) {
  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `你是一位台灣腎臟科醫師 iNephro。

【回答規範】
1. 針對問題解說，字數約 80-100 字。
2. 語氣專業溫暖，繁體中文。
3. 關鍵字標示：請務必將「醫學名詞」、「數據」、「食物名稱」用 **粗體** 包起來。

【格式嚴格要求】
回答結束後，請加上 "///" 符號，接著列出 3 個簡短的建議選項，用 "|" 符號隔開。
⚠️ 禁止寫 "1. 2. 3." 編號。
⚠️ 禁止寫 "後續建議：" 這種前言。

正確範例：
...以上是我的說明。/// 什麼是AKI? | 飲食要注意什麼? | 需要洗腎嗎?`
      },
      { role: "user", content: question }
    ],
    model: "gpt-4o-mini",
  });

  return {
    reply: completion.choices[0].message.content,
    confidence: 'medium',
    sources: []
  };
}

/**
 * 主處理函式
 */
export default async function handler(request) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // 處理 OPTIONS 請求（CORS preflight）
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const { question } = await request.json();

    if (!question || typeof question !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid question' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. 生成快取鍵
    const cacheKey = await generateCacheKey(question);
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
    const ASSISTANT_ID = process.env.ASSISTANT_ID;

    if (!OPENAI_KEY) {
      throw new Error('OpenAI API Key not configured');
    }

    // 6. 調用 AI（優先 Assistants API，失敗則降級）
    let result;

    try {
      if (ASSISTANT_ID && ASSISTANT_ID.startsWith('asst_')) {
        console.log('📚 使用 Assistants API');
        result = await callAssistantAPI(question, OPENAI_KEY, ASSISTANT_ID);

        // 標記知識庫來源
        if (result.confidence === 'high' && result.sources.length > 0) {
          result.reply = `✓ *此回答基於專業知識庫*\n\n${result.reply}`;
        }
      } else {
        throw new Error('Assistant ID not configured');
      }
    } catch (error) {
      console.warn('⚠️ Assistants API 失敗，降級到 ChatGPT:', error.message);
      result = await fallbackToChatGPT(question, OPENAI_KEY);
    }

    // 7. 存入快取（7 天過期，604800 秒）
    const cacheData = {
      ...result,
      timestamp: Date.now(),
      question // 保留原始問題，方便管理
    };

    if (cache) {
      await cache.set(cacheKey, cacheData, 7 * 24 * 60 * 60);
      console.log('💾 已存入快取');
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
        error: error.message || 'Internal server error',
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
