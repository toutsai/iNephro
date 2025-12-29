// api/chat.js - Vercel Edge Function with KV Cache
// 雲端快取層，大幅提升速度並降低 API 成本

import { kv } from '@vercel/kv';
import OpenAI from 'openai';

// Edge Runtime 配置
export const config = {
  runtime: 'edge',
};

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
    // 1. 解析請求
    const { question } = await request.json();

    if (!question || typeof question !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid question' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. 生成快取鍵
    const cacheKey = await generateCacheKey(question);
    console.log(`🔍 查詢快取: ${cacheKey}`);

    // 3. 檢查快取
    const cached = await kv.get(cacheKey);

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

    // 4. 從環境變數取得設定
    const OPENAI_KEY = process.env.VITE_OPENAI_KEY;
    const ASSISTANT_ID = process.env.VITE_ASSISTANT_ID;

    if (!OPENAI_KEY) {
      throw new Error('OpenAI API Key not configured');
    }

    // 5. 調用 AI（優先 Assistants API，失敗則降級）
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

    // 6. 存入快取（7 天過期）
    const cacheData = {
      ...result,
      timestamp: Date.now(),
      question // 保留原始問題，方便管理
    };

    await kv.set(cacheKey, cacheData, { ex: 7 * 24 * 60 * 60 });
    console.log('💾 已存入快取');

    // 7. 回傳結果
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
