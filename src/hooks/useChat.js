import { useState, useEffect } from 'react';

const INITIAL_MESSAGE = {
  role: 'doctor',
  text: '您好，我是 iNephro 智能醫師。我會根據專業的腎臟科知識庫為您解答。您可以點選左側主題，或直接問我問題。\n\n⚠️ 本系統為衛教輔助工具，非醫療診斷服務。所有資訊僅供參考，請遵循您的主治醫師建議。',
};

export function useChat(speak, onSendCallback) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('inephro_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(msg => !msg.isThinking);
        }
      }
    } catch (e) {
      console.warn('讀取對話記錄失敗:', e);
    }
    return [INITIAL_MESSAGE];
  });
  const [input, setInput] = useState('');

  // 對話持久化：儲存到 sessionStorage
  useEffect(() => {
    try {
      const toSave = messages.filter(msg => !msg.isThinking);
      sessionStorage.setItem('inephro_messages', JSON.stringify(toSave));
    } catch (e) {
      console.warn('儲存對話記錄失敗:', e);
    }
  }, [messages]);

  const callAI = async (userPrompt) => {
    // 移除思考提示（在實際回應前）
    const removeThinkingMessage = () => {
      setMessages(prev => prev.filter(msg => !msg.isThinking));
    };

    // === 第一層快取：localStorage（最快，0ms）===
    const CACHE_KEY_PREFIX = 'inephro_cache_';
    const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30天過期

    const getCacheKey = (prompt) => {
      return CACHE_KEY_PREFIX + btoa(encodeURIComponent(prompt));
    };

    const cacheKey = getCacheKey(userPrompt);
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { reply, timestamp, confidence } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        if (age < CACHE_EXPIRY) {
          console.log('⚡ localStorage 快取命中（0ms）');
          removeThinkingMessage();
          setMessages(prev => [...prev, { role: 'doctor', text: reply, confidence }]);
          speak(reply);
          return;
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (e) {
      console.warn('讀取 localStorage 快取失敗:', e);
    }

    // === 第二層：雲端 Edge Function（快取 + AI）===
    try {
      console.log('🌐 調用 Edge Function（雲端快取 + AI）');
      const startTime = Date.now();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userPrompt
        })
      });

      if (!response.ok) {
        // 檢查回應是否為 JSON 格式
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}`);
        } else {
          // HTML 錯誤頁面（如 504 Gateway Timeout）
          if (response.status === 504) {
            throw new Error('TIMEOUT');
          }
          throw new Error(`HTTP ${response.status}`);
        }
      }

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      if (data.fromCache) {
        console.log(`✅ 雲端快取命中！(${responseTime}ms, 快取年齡: ${data.cacheAge}秒)`);
      } else {
        console.log(`✅ API 調用成功 (${responseTime}ms)`);
      }

      const { reply, confidence } = data;

      removeThinkingMessage();
      setMessages(prev => [...prev, { role: 'doctor', text: reply, confidence }]);
      speak(reply);

      // 存入 localStorage 作為第一層快取
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          reply,
          confidence,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('localStorage 存儲失敗:', e);
      }

      return;

    } catch (error) {
      console.error('AI 呼叫錯誤:', error);
      removeThinkingMessage();

      let errorMessage = "抱歉，系統發生錯誤。";

      if (error.message === 'TIMEOUT') {
        errorMessage = "⏱️ 系統處理時間過長，請稍後再試。您也可以嘗試簡化問題內容。";
      } else if (error.message?.includes('API key')) {
        errorMessage = "API Key 無效，請檢查您的設定。";
      } else if (error.message?.includes('quota') || error.message?.includes('rate_limit')) {
        errorMessage = "API 使用額度已達上限，請稍後再試或檢查您的 OpenAI 帳戶。";
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = "網路連線錯誤，請檢查您的網路連線。";
      } else if (error.status === 429) {
        errorMessage = "請求過於頻繁，請稍後再試。";
      } else if (error.status === 401) {
        errorMessage = "API Key 驗證失敗，請確認 API Key 是否正確。";
      }

      setMessages(prev => [...prev, { role: 'doctor', text: errorMessage }]);
      speak(errorMessage);
    }
  };

  const handleSend = (text = null) => {
    const question = text || input;
    if (!question.trim()) return;

    setMessages(prev => [...prev, { role: 'patient', text: question }]);
    setInput('');
    if (onSendCallback) onSendCallback();

    // 顯示「思考中」訊息
    setMessages(prev => [...prev, { role: 'doctor', text: '🔍 正在查詢知識庫...', isThinking: true }]);

    // 直接調用 AI，在 callAI 內部會移除思考提示
    callAI(question);
  };

  const clearMessages = () => {
    setMessages([INITIAL_MESSAGE]);
    sessionStorage.removeItem('inephro_messages');
  };

  return {
    messages,
    setMessages,
    input,
    setInput,
    callAI,
    handleSend,
    clearMessages,
  };
}
