// api/tts-taiwanese.js - 台語 TTS API
// 支援純台語語音合成

// Edge Runtime 配置
export const config = {
  runtime: 'edge',
};

/**
 * 台語 TTS 服務選項
 *
 * 方案 1: 使用 HuggingFace 上的台語 TTS 模型
 * 方案 2: 使用本地部署的台語 TTS（如 espeak-ng + 台語語音檔）
 * 方案 3: 使用第三方台語 TTS API（如有）
 */

/**
 * 方案 1: HuggingFace Taiwanese TTS
 * 使用社群訓練的台語語音模型
 */
async function generateTaiwaneseSpeech(text) {
  const HF_API_TOKEN = process.env.HUGGINGFACE_API_TOKEN;

  // HuggingFace 上的台語 TTS 模型（範例）
  // 實際模型需要從 HuggingFace 搜尋可用的台語 TTS
  const MODEL_ID = 'formospeech/taiwanese-tts'; // 這需要替換成實際存在的模型

  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${MODEL_ID}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: text,
          options: {
            wait_for_model: true,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.status}`);
    }

    // 回傳音訊 blob
    return await response.arrayBuffer();
  } catch (error) {
    console.error('HuggingFace TTS 錯誤:', error);
    throw error;
  }
}

/**
 * 方案 2: 使用簡易台語語音對照表
 * 將文字轉換為台語拼音，再調用通用 TTS
 */
function convertToTaiwaneseRomanization(text) {
  // 這裡需要一個中文到台語拼音的轉換邏輯
  // 可以使用台語羅馬字（POJ）或台羅拼音

  // 簡化範例：基本詞彙對照
  const taiwaneseDict = {
    '你好': 'lí hó',
    '早安': 'tsá-àn',
    '謝謝': 'tō-siā',
    '腎臟': 'sīn-tsōng',
    '醫生': 'i-sing',
    '病人': 'pēnn-lâng',
    // ... 更多詞彙
  };

  let romanized = text;
  for (const [chinese, taiwanese] of Object.entries(taiwaneseDict)) {
    romanized = romanized.replace(new RegExp(chinese, 'g'), taiwanese);
  }

  return romanized;
}

/**
 * CORS origin check
 */
function getCorsHeaders(request) {
  const origin = request.headers?.get('origin') || '';
  const allowedPatterns = [
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
    /^https:\/\/.*\.vercel\.app$/,
    /^https:\/\/inephro\.vercel\.app$/,
    /^https:\/\/.*inephro.*\.vercel\.app$/,
  ];
  const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...(isAllowed ? { 'Vary': 'Origin' } : {}),
  };
}

/**
 * 主處理函式
 */
export default async function handler(request) {
  // CORS headers
  const corsHeaders = getCorsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method === 'GET') {
    return new Response(
      JSON.stringify({
        service: '台語 TTS',
        status: '測試中',
        note: '目前支援有限，建議使用完整的台語語音模型服務',
        alternatives: [
          {
            name: 'iTRITTS',
            provider: '工研院',
            url: 'https://www.itri.org.tw',
            status: '需申請授權'
          },
          {
            name: 'HuggingFace 台語 TTS',
            provider: '開源社群',
            url: 'https://huggingface.co',
            status: '需設定 API Token'
          }
        ],
        setup: {
          step1: '註冊 HuggingFace 帳號',
          step2: '取得 API Token: https://huggingface.co/settings/tokens',
          step3: '在 Vercel Dashboard 設定環境變數 HUGGINGFACE_API_TOKEN',
          step4: '尋找可用的台語 TTS 模型（搜尋關鍵字：taiwanese, tts, minnan）'
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { text, mode = 'huggingface' } = await request.json();

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid text parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 檢查是否已設定 HuggingFace API Token
    if (!process.env.HUGGINGFACE_API_TOKEN) {
      return new Response(
        JSON.stringify({
          error: 'HuggingFace API Token not configured',
          message: '請先設定 HUGGINGFACE_API_TOKEN 環境變數',
          setup: '1. 前往 https://huggingface.co/settings/tokens\n2. 建立新的 Token\n3. 在 Vercel Dashboard 設定環境變數'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎙️ 台語 TTS: ${text.substring(0, 50)}...`);

    // 嘗試使用 HuggingFace 台語 TTS
    try {
      const audioBuffer = await generateTaiwaneseSpeech(text);

      return new Response(audioBuffer, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'audio/wav',
          'Content-Length': audioBuffer.byteLength.toString(),
        },
      });
    } catch (ttsError) {
      // 如果 TTS 失敗，返回建議
      return new Response(
        JSON.stringify({
          error: 'Taiwanese TTS not available',
          message: '台語 TTS 模型尚未設定或模型不可用',
          suggestion: '請參考 GET /api/tts-taiwanese 查看設定步驟',
          fallback: '建議暫時使用台灣國語（Google Cloud TTS: cmn-TW）'
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    console.error('❌ 台語 TTS 錯誤:', error);

    return new Response(
      JSON.stringify({
        error: 'Service error',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
