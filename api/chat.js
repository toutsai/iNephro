// api/chat.js - Vercel Edge Function with Upstash Redis Cache & Streaming
// 改進：支援串流回應 (Streaming)、Thread Reuse、與成本優化

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
      if (data.result === null) {
        return null;
      }
      return JSON.parse(data.result);
    } catch (error) {
      console.error('Upstash GET error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 604800) {
    try {
      const jsonValue = JSON.stringify(value);
      const response = await fetch(`${this.url}/setex/${key}/${ttl}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonValue),
      });
      return response.ok;
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
 * 主處理函式
 */
export default async function handler(request) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Thread-Id, X-From-Cache', // 允許自定義 header
    'Access-Control-Expose-Headers': 'X-Thread-Id, X-From-Cache', // 暴露 header 給前端
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. 初始化資源
    const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
    const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    const ASSISTANT_ID = process.env.ASSISTANT_ID;

    if (!OPENAI_KEY) throw new Error('OpenAI API Key not configured');

    const cache = (UPSTASH_URL && UPSTASH_TOKEN)
      ? new UpstashCache(UPSTASH_URL, UPSTASH_TOKEN)
      : null;

    // 2. 解析請求
    const { question, threadId: providedThreadId } = await request.json();

    if (!question || typeof question !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid question' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. 檢查快取
    const cacheKey = await generateCacheKey(question);
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
          cacheAge: Math.floor((Date.now() - cached.timestamp) / 1000)
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-From-Cache': 'true'
          }
        }
      );
    }

    // 4. 初始化 OpenAI 與 Thread
    const client = new OpenAI({ apiKey: OPENAI_KEY });
    let threadId = providedThreadId;

    // 如果沒有 threadId 或是舊的 threadId，則建立新的 (或驗證舊的)
    // 簡單起見，如果沒提供就建新的。如果提供了就直接用。
    if (!threadId) {
      const thread = await client.beta.threads.create();
      threadId = thread.id;
    }

    // 5. 加入 User Message
    await client.beta.threads.messages.create(threadId, {
      role: 'user',
      content: question
    });

    // 6. 建立串流回應 (TransformStream)
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // 7. 開始異步處理並寫入串流
    (async () => {
      let fullReply = "";

      try {
        if (ASSISTANT_ID && ASSISTANT_ID.startsWith('asst_')) {
          // --- Assistants API Streaming ---
          const stream = client.beta.threads.runs.stream(threadId, {
            assistant_id: ASSISTANT_ID,
            // 成本優化：限制上下文長度
            truncation_strategy: { type: 'auto', last_messages: 10 }
          });

          for await (const event of stream) {
            if (event.event === 'thread.message.delta') {
              const chunk = event.data.delta.content?.[0]?.text?.value;
              if (chunk) {
                fullReply += chunk;
                await writer.write(encoder.encode(chunk));
              }
            }
          }
        } else {
          // --- Fallback to ChatGPT Streaming ---
          const stream = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "你是專業的腎臟科醫師 iNephro。請用繁體中文回答，並在醫學名詞使用**粗體**。回答結束後加上 '///' 並提供三個建議問題。" },
              { role: "user", content: question }
            ],
            stream: true,
          });

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullReply += content;
              await writer.write(encoder.encode(content));
            }
          }
        }

        // 8. 存入快取 (串流結束後)
        if (fullReply && cache) {
          // 標記知識庫來源 (簡易判斷)
          let confidence = 'medium';
          if (fullReply.includes('【') && fullReply.includes('】')) {
             confidence = 'high';
          }

          // 如果是 Assistant API，前面可能沒有加這句，這裡可以考慮是否要補，
          // 但為了保持原汁原味，我們只存 raw reply。
          // 之前的代碼會加 "✓ *此回答基於專業知識庫*"，如果需要可以在前端加，或在這裡修改 fullReply。
          // 這裡選擇保持原始回應。

          await cache.set(cacheKey, {
            reply: fullReply,
            confidence,
            timestamp: Date.now(),
            question
          }, 7 * 24 * 60 * 60);
          console.log('💾 (Stream) 已存入快取');
        }

      } catch (e) {
        console.error('Stream Error:', e);
        const errorMsg = `\n[連線錯誤: ${e.message}]`;
        await writer.write(encoder.encode(errorMsg));
      } finally {
        await writer.close();
      }
    })();

    // 9. 立即回傳 Response (Stream)
    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Thread-Id': threadId, // 回傳 threadId 供前端保存
        'X-From-Cache': 'false'
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
