// src/App.jsx - Edge Function 版本（雲端快取 + AI + Streaming）
import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Doctor3D from './Doctor3D';
import ReactMarkdown from 'react-markdown';

// --- 1. 固定精選主題 (有圖) ---
const TOPIC_DATA = {
  'aki': {
    title: '急性腎損傷 (AKI)',
    image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?q=80&w=1000&auto=format&fit=crop',
    prompt: '請簡單介紹急性腎損傷(AKI)的定義與常見原因。'
  },
  'ckd': {
    title: '慢性腎臟病 (CKD)',
    image: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?q=80&w=1000&auto=format&fit=crop',
    prompt: '請說明慢性腎臟病(CKD)的五個分期是什麼？'
  },
  'hemodialysis': {
    title: '血液透析',
    image: 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?q=80&w=1000&auto=format&fit=crop',
    prompt: '請詳細介紹血液透析（洗腎）的原理、流程、注意事項與照護重點。'
  },
  'peritoneal-dialysis': {
    title: '腹膜透析',
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1000&auto=format&fit=crop',
    prompt: '請說明腹膜透析的原理、優缺點、操作方式與居家照護注意事項。'
  }
};

// --- 2. 隨機關鍵字池 (無圖，自動生成) ---
const KEYWORD_POOL = [
  // 症狀類
  "蛋白尿", "血尿", "下肢水腫", "夜尿", "泡沫尿", "腰痛", "貧血", "高血壓",
  // 疾病類
  "糖尿病腎病變", "高血壓腎病變", "多囊腎", "腎結石", "腎絲球腎炎", "痛風", "尿路感染", "腎盂腎炎",
  // 數值類
  "肌酸酐 (Creatinine)", "腎絲球過濾率 (eGFR)", "尿素氮 (BUN)", "糖化血色素", "尿酸",
  // 治療與藥物
  "血液透析 (洗腎)", "腹膜透析", "腎臟移植", "利尿劑", "止痛藥對腎臟影響", "顯影劑",
  // 飲食生活
  "低蛋白飲食", "限水", "楊桃中毒", "低鈉飲食"
];

function App() {
  // --- State ---
  const [activeCategory, setActiveCategory] = useState('home');
  const [randomTopics, setRandomTopics] = useState([]); // 存隨機選出的字
  const [messages, setMessages] = useState([
    {
      role: 'doctor',
      text: '您好，我是 iNephro 智能醫師。我會根據專業的腎臟科知識庫為您解答。您可以點選左側主題，或直接問我問題。\n\n⚠️ 本系統為衛教輔助工具，非醫療診斷服務。所有資訊僅供參考，請遵循您的主治醫師建議。',
    }
  ]);
  const [input, setInput] = useState('');
  const [isDoctorSpeaking, setIsDoctorSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]); // 所有可用語音
  const [isDoctorMinimized, setIsDoctorMinimized] = useState(false); // 行動版醫師是否縮小

  // Thread ID for conversation continuity
  const [threadId, setThreadId] = useState(() => localStorage.getItem('inephro_thread_id'));

  // --- 初始化與隨機邏輯 ---
  
  const refreshTopics = React.useCallback(() => {
    const shuffled = [...KEYWORD_POOL].sort(() => 0.5 - Math.random());
    setRandomTopics(shuffled.slice(0, 10));
  }, []);

  useEffect(() => {
    refreshTopics();
  }, [refreshTopics]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const loadVoices = () => {
      const all = window.speechSynthesis.getVoices();
      setAvailableVoices(all);

      const chinese = all.filter(v =>
        v.lang.includes('zh') ||
        v.lang.includes('CN') ||
        v.lang.includes('TW') ||
        v.lang.includes('nan')
      );

      const savedVoiceName = localStorage.getItem('selectedVoiceName');
      if (savedVoiceName) {
        const saved = all.find(v => v.name === savedVoiceName);
        if (saved) {
          setSelectedVoice(saved);
          return;
        }
      }

      const zhiwei = chinese.find(v => v.name.toLowerCase().includes('zhiwei') || v.name.includes('志偉'));
      const maleChinese = chinese.find(v => v.name.toLowerCase().includes('male') || v.name.includes('男'));
      const googleMale = chinese.find(v => v.name.toLowerCase().includes('google') && v.name.toLowerCase().includes('chinese'));

      if (zhiwei) setSelectedVoice(zhiwei);
      else if (maleChinese) setSelectedVoice(maleChinese);
      else if (googleMale) setSelectedVoice(googleMale);
      else if (chinese.length > 0) setSelectedVoice(chinese[0]);
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  // --- 功能函式 ---

  const speak = (rawText) => {
    window.speechSynthesis.cancel();
    let textToSpeak = rawText.split('///')[0];
    textToSpeak = textToSpeak
      .replace(/✓\s*\*此回答基於專業知識庫\*/g, '')
      .replace(/💡\s*AI 搜尋回答/g, '')
      .replace(/【.*?】/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/source/gi, '')
      .replace(/\*\*/g, '')
      .replace(/✓|✗|●|►|•|💡/g, '')
      .replace(/\n{2,}/g, '\n')
      .trim();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    }
    utterance.rate = 1.0;
    utterance.onstart = () => setIsDoctorSpeaking(true);
    utterance.onend = () => setIsDoctorSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsDoctorSpeaking(false);
  };

  const callAI = async (userPrompt) => {
    // 移除思考提示
    const removeThinkingMessage = () => {
      setMessages(prev => prev.filter(msg => !msg.isThinking));
    };

    // === 第一層快取：localStorage (保持不變) ===
    const CACHE_KEY_PREFIX = 'inephro_cache_';
    const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000;
    const getCacheKey = (prompt) => CACHE_KEY_PREFIX + btoa(encodeURIComponent(prompt));
    const cacheKey = getCacheKey(userPrompt);

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { reply, timestamp, confidence } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          console.log('⚡ localStorage 快取命中');
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

    // === 第二層：雲端 Edge Function (API) ===
    try {
      console.log('🌐 調用 Edge Function');

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userPrompt,
          threadId: threadId // 傳送 threadId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // 更新 threadId
      const newThreadId = response.headers.get('X-Thread-Id');
      if (newThreadId && newThreadId !== threadId) {
        setThreadId(newThreadId);
        localStorage.setItem('inephro_thread_id', newThreadId);
        console.log('🔗 Thread ID updated:', newThreadId);
      }

      const contentType = response.headers.get('Content-Type');
      removeThinkingMessage();

      // 準備接收回應
      setMessages(prev => [...prev, { role: 'doctor', text: '' }]);

      let fullReply = "";
      let confidence = 'medium';

      if (contentType && contentType.includes('application/json')) {
        // --- 情況 A: 快取命中 (JSON) ---
        const data = await response.json();
        fullReply = data.reply;
        confidence = data.confidence;

        console.log('✅ 雲端快取命中');
        setMessages(prev => {
          const newMsg = [...prev];
          newMsg[newMsg.length - 1].text = fullReply;
          newMsg[newMsg.length - 1].confidence = confidence;
          return newMsg;
        });

      } else {
        // --- 情況 B: 實時生成 (Stream) ---
        console.log('🌊 接收串流回應...');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullReply += chunk;

          // 即時更新 UI
          setMessages(prev => {
            const newMsg = [...prev];
            // 確保有訊息可以更新，避免並發問題
            if (newMsg.length > 0) {
              const lastMsg = newMsg[newMsg.length - 1];
              lastMsg.text = (lastMsg.text || "") + chunk;
            }
            return newMsg;
          });
        }

        // 簡易判斷是否有引用來源
        if (fullReply.includes('【') && fullReply.includes('】')) {
          confidence = 'high';
        }
      }

      // 播放語音 (串流結束後)
      speak(fullReply);

      // 存入 localStorage
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          reply: fullReply,
          confidence,
          timestamp: Date.now()
        }));
      } catch (e) { console.warn('localStorage 存儲失敗:', e); }

    } catch (error) {
      console.error('AI 呼叫錯誤:', error);
      removeThinkingMessage();

      let errorMessage = "抱歉，系統發生錯誤。";
      // 錯誤處理邏輯
      if (error.message?.includes('API key')) errorMessage = "API Key 無效，請檢查您的設定。";
      else if (error.message?.includes('quota')) errorMessage = "API 使用額度已達上限，請稍後再試。";
      else if (error.message?.includes('network')) errorMessage = "網路連線錯誤，請檢查您的網路連線。";
      else if (error.message?.includes('429')) errorMessage = "請求過於頻繁，請稍後再試。";

      setMessages(prev => [...prev, { role: 'doctor', text: errorMessage }]);
      speak(errorMessage);
    }
  };

  const handleSend = (text = null) => {
    const question = text || input;
    if (!question.trim()) return;

    setMessages(prev => [...prev, { role: 'patient', text: question }]);
    setInput('');
    setIsDoctorSpeaking(false);
    setMessages(prev => [...prev, { role: 'doctor', text: '🔍 正在思考中...', isThinking: true }]);

    callAI(question);
  };

  const handleMenuClick = (keyOrKeyword) => {
    setActiveCategory(keyOrKeyword);
    let prompt = "";

    if (TOPIC_DATA[keyOrKeyword]) {
      prompt = TOPIC_DATA[keyOrKeyword].prompt;
    } else {
      prompt = `請詳細介紹關於「${keyOrKeyword}」的腎臟科衛教知識，包含定義、症狀與照護重點。`;
    }

    setMessages(prev => [...prev, { role: 'doctor', text: '🔍 正在查詢知識庫...', isThinking: true }]);
    callAI(prompt);
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (isRecording) { setIsRecording(false); return; }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-TW'; 
    recognition.interimResults = true; 
    recognition.continuous = false;

    recognition.onstart = () => { setIsRecording(true); setInput('正在聆聽...'); };
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      setInput(transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  const parseMessage = (rawText) => {
    if (!rawText) return { content: '', suggestions: [] };
    if (rawText === '...') return { content: '...', suggestions: [] };

    const parts = rawText.split('///');
    let content = parts[0].trim();

    content = content.replace(/【[^】]*source[^】]*】/g, '');
    content = content.replace(/\[[^\]]*source[^\]]*\]/g, '');

    let suggestions = [];
    if (parts[1]) {
      let rawSuggestions = parts[1].trim();
      rawSuggestions = rawSuggestions
        .replace(/後續建議.*[:：]/g, '')
        .replace(/建議.*[:：]/g, '')
        .replace(/｜/g, '|')
        .replace(/\n/g, '|');
      suggestions = rawSuggestions.split('|').map(s => s.trim()).filter(s => s.length > 0);
    }
    return { content, suggestions };
  };

  return (
    <div className="main-container">
      {/* 快速主題橫向滑動 (行動版) */}
      <div className="quick-topics-container">
        <div className="quick-topics">
          {Object.keys(TOPIC_DATA).map(key => (
            <div key={key} className={`quick-topic-chip ${activeCategory === key ? 'active' : ''}`} onClick={() => handleMenuClick(key)}>
              ⭐ {TOPIC_DATA[key].title}
            </div>
          ))}
          {randomTopics.map((keyword, index) => (
            <div key={`quick-${index}`} className={`quick-topic-chip ${activeCategory === keyword ? 'active' : ''}`} onClick={() => handleMenuClick(keyword)}>
              {keyword}
            </div>
          ))}
        </div>
      </div>

      {/* 左欄：選單區 (桌面版) */}
      <div className="sidebar-menu">
        <div className="brand-title">iNephro 衛教諮詢室</div>
        <div style={{fontSize:'12px', color:'#aaa', marginBottom:'5px', paddingLeft:'10px'}}>📌 精選主題</div>
        {Object.keys(TOPIC_DATA).map(key => (
          <div key={key} className={`menu-item ${activeCategory === key ? 'active' : ''}`} onClick={() => handleMenuClick(key)}>
            ⭐ {TOPIC_DATA[key].title}
          </div>
        ))}
        <hr style={{borderColor: 'rgba(255,255,255,0.1)', margin: '15px 0'}} />
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingRight:'10px', marginBottom:'5px'}}>
           <div style={{fontSize:'12px', color:'#aaa', paddingLeft:'10px'}}>🎲 今日熱搜</div>
           <button onClick={refreshTopics} style={{background:'none', border:'none', color:'#3498db', cursor:'pointer', fontSize:'12px'}}>🔄 換一組</button>
        </div>
        {randomTopics.map((keyword, index) => (
          <div key={index} className={`menu-item ${activeCategory === keyword ? 'active' : ''}`} onClick={() => handleMenuClick(keyword)}>
            📄 {keyword}
          </div>
        ))}
        <div style={{marginTop: 'auto', fontSize: '12px', color: '#aaa', textAlign: 'center'}}>Dr. AI v2.3</div>
      </div>

      {/* 中欄：對話區 */}
      <div className="center-stage">
        <div className="chat-scroll-area">
          {messages.map((msg, index) => {
            const { content, suggestions } = parseMessage(msg.text);
            return (
              <div key={index} className={`message-wrapper ${msg.role}`}>
                <div className={`message ${msg.role}`}>
                  <div className="markdown-content">
                    {msg.isThinking ? (
                      <>
                        {content}
                        <span className="thinking-animation"><span className="dot"></span><span className="dot"></span><span className="dot"></span></span>
                      </>
                    ) : (
                      <ReactMarkdown>{content}</ReactMarkdown>
                    )}
                  </div>
                </div>
                {msg.role === 'doctor' && suggestions.length > 0 && (
                  <div className="suggestion-chips">
                    {suggestions.map((s, i) => (
                      <button key={i} className="chip" onClick={() => handleSend(s)}>{s}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area-wrapper">
          <div className="input-group">
            <button className={`icon-btn ${isRecording ? 'recording' : ''}`} onClick={handleVoiceInput}>🎙️</button>
            <input 
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isRecording ? "聆聽中..." : "請輸入..."}
            />
            <button className="icon-btn" onClick={() => handleSend()} style={{color: '#3498db'}}>➤</button>
          </div>
        </div>
      </div>

      {/* 右欄：3D 醫師 (桌面版) */}
      <div className="right-panel">
        <div className="voice-selector">
          <label htmlFor="voice-select">🔊 語音選擇：</label>
          <select
            id="voice-select"
            value={selectedVoice?.name || ''}
            onChange={(e) => {
              const voice = availableVoices.find(v => v.name === e.target.value);
              if (voice) {
                setSelectedVoice(voice);
                localStorage.setItem('selectedVoiceName', voice.name);
              }
            }}
          >
            {availableVoices
              .filter(v => v.lang.includes('zh') || v.lang.includes('CN') || v.lang.includes('TW') || v.lang.includes('nan'))
              .map(voice => (
                <option key={voice.name} value={voice.name}>{voice.name} ({voice.lang})</option>
              ))}
          </select>
        </div>
        <div className="doctor-status">{isDoctorSpeaking ? '🗣️ 解說中... (點擊停止)' : '👂 聆聽中'}</div>
        <div className="doctor-container">
          <Doctor3D isSpeaking={isDoctorSpeaking} onStopSpeaking={stopSpeaking} />
        </div>
      </div>

      {/* 右下角浮動 3D 醫師 (行動版) */}
      <div className={`doctor-floating ${isDoctorSpeaking ? 'speaking' : ''} ${isDoctorMinimized ? 'minimized' : ''}`}>
        <button className="doctor-close-btn" onClick={() => setIsDoctorMinimized(!isDoctorMinimized)}>
          {isDoctorMinimized ? '➕' : '➖'}
        </button>
        <Doctor3D isSpeaking={isDoctorSpeaking} onStopSpeaking={stopSpeaking} isMobile={true} />
      </div>
    </div>
  );
}

export default App;
