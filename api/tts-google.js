// api/tts-google.js - Google Cloud Text-to-Speech API
// 支援台灣國語語音（最接近台語的選項）

// Edge Runtime 配置
export const config = {
  runtime: 'edge',
};

/**
 * Google Cloud TTS 可用的台灣中文語音
 * 參考：https://cloud.google.com/text-to-speech/docs/voices
 */
const TAIWAN_VOICES = {
  'tw-female-1': {
    languageCode: 'cmn-TW',
    name: 'cmn-TW-Wavenet-A',
    ssmlGender: 'FEMALE',
    description: '台灣女聲（標準）'
  },
  'tw-female-2': {
    languageCode: 'cmn-TW',
    name: 'cmn-TW-Wavenet-B',
    ssmlGender: 'FEMALE',
    description: '台灣女聲（柔和）'
  },
  'tw-male-1': {
    languageCode: 'cmn-TW',
    name: 'cmn-TW-Wavenet-C',
    ssmlGender: 'MALE',
    description: '台灣男聲（專業）'
  },
  'tw-male-2': {
    languageCode: 'cmn-TW',
    name: 'cmn-TW-Wavenet-D',
    ssmlGender: 'MALE',
    description: '台灣男聲（溫和）'
  },
};

/**
 * 調用 Google Cloud TTS REST API
 */
async function generateSpeech(text, voiceId = 'tw-male-1') {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;

  if (!apiKey) {
    throw new Error('Google Cloud API Key not configured');
  }

  const voiceConfig = TAIWAN_VOICES[voiceId] || TAIWAN_VOICES['tw-male-1'];

  const requestBody = {
    input: { text },
    voice: {
      languageCode: voiceConfig.languageCode,
      name: voiceConfig.name,
      ssmlGender: voiceConfig.ssmlGender,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 1.0,
      pitch: 0.0,
    },
  };

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google TTS API error: ${error}`);
  }

  const data = await response.json();

  // Google 回傳 base64 編碼的音訊
  return data.audioContent;
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

  // 處理 OPTIONS 請求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 處理 GET 請求：回傳可用語音列表
  if (request.method === 'GET') {
    return new Response(
      JSON.stringify({
        voices: TAIWAN_VOICES,
        note: '台灣國語語音（目前主流 TTS 服務無純台語支援）'
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
    const { text, voice = 'tw-male-1' } = await request.json();

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid text parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Google TTS 限制 5000 字元
    if (text.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Text too long (max 5000 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎙️ Google TTS: ${text.substring(0, 50)}... (語音: ${voice})`);

    // 調用 Google Cloud TTS
    const audioBase64 = await generateSpeech(text, voice);

    // 將 base64 轉換為 binary
    const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('❌ Google TTS 錯誤:', error);

    let errorMessage = 'TTS service error';
    let statusCode = 500;

    if (error.message?.includes('API key')) {
      errorMessage = 'Google Cloud API Key not configured';
      statusCode = 500;
    } else if (error.message?.includes('quota')) {
      errorMessage = 'API quota exceeded';
      statusCode = 429;
    }

    return new Response(
      JSON.stringify({ error: errorMessage, details: error.message }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
