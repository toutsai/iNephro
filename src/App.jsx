// src/App.jsx - Assistants API 版本 (知識庫 RAG + 信心度檢測)
import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Doctor3D from './Doctor3D';
import AssistantService from './services/assistantAPI';
import OpenAI from 'openai';
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

// 通用圖片 (給隨機主題用)
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1000&auto=format&fit=crop";

function App() {
  // 從環境變數讀取設定
  const OPENAI_KEY = import.meta.env.VITE_OPENAI_KEY || "";
  const ASSISTANT_ID = import.meta.env.VITE_ASSISTANT_ID || "";

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
  const [useAssistantAPI, setUseAssistantAPI] = useState(false); // 是否使用 Assistants API
  const assistantServiceRef = useRef(null); // Assistant 服務實例

  // --- 初始化與隨機邏輯 ---
  
  // ★★★ 關鍵修改：用 useCallback 包起來 ★★★
  const refreshTopics = React.useCallback(() => {
    const shuffled = [...KEYWORD_POOL].sort(() => 0.5 - Math.random());
    setRandomTopics(shuffled.slice(0, 10));
  }, []); // 尾巴這個 [] 代表它永遠不會變

  // 一進來就先抽一次
  useEffect(() => {
    refreshTopics();
  }, []);

  // ✅ 初始化 Assistants API
  useEffect(() => {
    // 檢查是否有設定 Assistant ID
    if (OPENAI_KEY && ASSISTANT_ID && ASSISTANT_ID.startsWith('asst_')) {
      try {
        assistantServiceRef.current = new AssistantService(OPENAI_KEY, ASSISTANT_ID);
        setUseAssistantAPI(true);
        console.log('✅ Assistants API 已啟用（知識庫模式）');
      } catch (error) {
        console.error('❌ Assistants API 初始化失敗，將使用一般模式:', error);
        setUseAssistantAPI(false);
      }
    } else {
      console.log('ℹ️ 未設定 Assistant ID，使用一般 ChatGPT 模式');
      setUseAssistantAPI(false);
    }
  }, [OPENAI_KEY, ASSISTANT_ID]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const loadVoices = () => {
      const all = window.speechSynthesis.getVoices();
      const chinese = all.filter(v => v.lang.includes('zh') || v.lang.includes('CN') || v.lang.includes('TW'));
      const zhiwei = chinese.find(v => v.name.includes('Zhiwei'));
      if (zhiwei) setSelectedVoice(zhiwei);
      else if (chinese.length > 0) setSelectedVoice(chinese[0]);
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  // --- 功能函式 ---

  const speak = (rawText) => {
    window.speechSynthesis.cancel();

    // 過濾掉按鈕指令
    let textToSpeak = rawText.split('///')[0];

    // 過濾符號和特殊標記
    textToSpeak = textToSpeak
      .replace(/✓\s*\*此回答基於專業知識庫\*/g, '') // 移除知識庫標記
      .replace(/💡\s*AI 搜尋回答/g, '') // 移除 AI 搜尋標記
      .replace(/【.*?】/g, '') // 移除【】內的文字
      .replace(/\[.*?\]/g, '') // 移除 [source] 等
      .replace(/source/gi, '') // 移除 source 文字
      .replace(/\*\*/g, '') // 移除粗體標記 **
      .replace(/✓|✗|●|►|•|💡/g, '') // 移除特殊符號
      .replace(/\n{2,}/g, '\n') // 多個換行改成單個
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

  // 中斷語音播放
  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsDoctorSpeaking(false);
  };

  const callAI = async (userPrompt, contextImage = null) => {
    // 移除思考提示（在實際回應前）
    const removeThinkingMessage = () => {
      setMessages(prev => prev.filter(msg => !msg.isThinking));
    };

    // === 快取機制 ===
    const CACHE_KEY_PREFIX = 'inephro_cache_';
    const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7天過期

    // 生成快取鍵（使用 prompt 的 hash）
    const getCacheKey = (prompt) => {
      return CACHE_KEY_PREFIX + btoa(encodeURIComponent(prompt)).slice(0, 50);
    };

    // 檢查快取
    const cacheKey = getCacheKey(userPrompt);
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { reply, timestamp, confidence } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        if (age < CACHE_EXPIRY) {
          // 快取有效，直接使用
          console.log('✅ 使用快取回應');
          removeThinkingMessage();
          setMessages(prev => [...prev, { role: 'doctor', text: reply, confidence }]);
          speak(reply);
          return;
        } else {
          // 快取過期，移除
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (e) {
      console.warn('讀取快取失敗:', e);
    }
    // === 快取機制結束 ===

    if (!OPENAI_KEY.startsWith("sk-")) {
      removeThinkingMessage();
      const errorMsg = "請先設定 OpenAI API Key 才能使用對話功能。";
      setMessages(prev => [...prev, { role: 'doctor', text: errorMsg }]);
      speak(errorMsg);
      return;
    }

    try {
      // ========================================
      // 🔵 模式 1: Assistants API（知識庫模式）
      // ========================================
      if (useAssistantAPI && assistantServiceRef.current) {
        console.log('📚 嘗試使用 Assistants API（知識庫檢索模式）');

        try {
          const result = await assistantServiceRef.current.sendMessage(userPrompt);
          const { reply, confidence, sources } = result;

          // 根據信心度處理回覆
          let finalReply = reply;

          if (confidence === 'low') {
            // 信心度低 - 建議轉人工
            finalReply = `💡 **提示**：這個問題比較複雜，建議您諮詢專業醫師獲得更準確的建議。\n\n${reply}`;
          } else if (confidence === 'high' && sources.length > 0) {
            // 高信心度 - 顯示有引用來源（標記放在最前面）
            finalReply = `✓ *此回答基於專業知識庫*\n\n${reply}`;
          }

          removeThinkingMessage();
          setMessages(prev => [...prev, { role: 'doctor', text: finalReply, confidence }]);
          speak(finalReply);

          // 存入快取
          try {
            localStorage.setItem(cacheKey, JSON.stringify({
              reply: finalReply,
              confidence,
              timestamp: Date.now()
            }));
          } catch (e) {
            console.warn('快取存儲失敗:', e);
          }

          console.log('✅ Assistants API 回答成功');
          return; // 成功就結束

        } catch (assistantError) {
          // ⚠️ Assistants API 失敗 - 降級到一般模式
          console.error('❌ Assistants API 失敗，自動切換到一般 ChatGPT 模式:', assistantError);
          console.log('🔄 降級到一般 ChatGPT API...');

          // 繼續執行下面的一般模式（不要 return）
        }
      }

      // ========================================
      // 🟢 模式 2: 一般 ChatGPT API（通用模式 / 降級模式）
      // ========================================
      console.log('💬 使用一般 ChatGPT API（通用模式）');

      const openai = new OpenAI({ apiKey: OPENAI_KEY, dangerouslyAllowBrowser: true });

      let systemPrompt = `
        你是一位台灣腎臟科醫師 iNephro。

        【回答規範】
        1. 針對問題解說，字數約 80-100 字。
        2. 語氣專業溫暖，繁體中文。
        3. 關鍵字標示：請務必將「醫學名詞」、「數據」、「食物名稱」用 **粗體** 包起來。

        【格式嚴格要求】
        回答結束後，請加上 "///" 符號，接著列出 3 個簡短的建議選項，用 "|" 符號隔開。
        ⚠️ 禁止寫 "1. 2. 3." 編號。
        ⚠️ 禁止寫 "後續建議：" 這種前言。

        正確範例：
        ...以上是我的說明。/// 什麼是AKI? | 飲食要注意什麼? | 需要洗腎嗎?
      `;

      if (contextImage) {
        systemPrompt += `\n目前畫面上顯示了一張衛教圖片，請呼應圖片內容。`;
      }

      const MAX_HISTORY_MESSAGES = 20;
      const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);

      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          ...recentMessages.map(m => ({
            role: m.role === 'doctor' ? 'assistant' : 'user',
            content: m.text.split('///')[0]
          })),
          { role: "user", content: userPrompt }
        ],
        model: "gpt-4o-mini",
      });

      const reply = completion.choices[0].message.content;
      removeThinkingMessage();
      setMessages(prev => [...prev, { role: 'doctor', text: reply }]);
      speak(reply);

      // 存入快取
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          reply,
          confidence: 'medium',
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('快取存儲失敗:', e);
      }

    } catch (error) {
      console.error('AI 呼叫錯誤:', error);
      removeThinkingMessage();

      let errorMessage = "抱歉，系統發生錯誤。";

      if (error.message?.includes('API key')) {
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
    setIsDoctorSpeaking(false);

    // 顯示「思考中」訊息
    const thinkingMessage = useAssistantAPI
      ? '🔍 正在查詢知識庫...'
      : '🤔 思考中...';

    setMessages(prev => [...prev, { role: 'doctor', text: thinkingMessage, isThinking: true }]);

    // 直接調用 AI，在 callAI 內部會移除思考提示
    callAI(question);
  };

  // ★★★ 修改後的選單點擊處理 (整合隨機功能) ★★★
  const handleMenuClick = (keyOrKeyword) => {
    setActiveCategory(keyOrKeyword);

    let title = "";
    let prompt = "";

    // 判斷是「固定主題」還是「隨機關鍵字」
    if (TOPIC_DATA[keyOrKeyword]) {
      // 是固定主題
      const data = TOPIC_DATA[keyOrKeyword];
      title = data.title;
      prompt = data.prompt;
    } else {
      // 是隨機關鍵字
      title = keyOrKeyword;
      prompt = `請詳細介紹關於「${keyOrKeyword}」的腎臟科衛教知識，包含定義、症狀與照護重點。`;
    }

    // 顯示「思考中」訊息（不顯示圖片）
    const thinkingMessage = useAssistantAPI
      ? '🔍 正在查詢知識庫...'
      : '🤔 思考中...';

    setMessages(prev => [...prev, { role: 'doctor', text: thinkingMessage, isThinking: true }]);

    // 直接調用 AI，在 callAI 內部會移除思考提示
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

    // 過濾來源標記【4:5†source】【4:1†source】等
    content = content.replace(/【[^】]*source[^】]*】/g, '');
    content = content.replace(/\[[^\]]*source[^\]]*\]/g, '');

    let suggestions = [];

    if (parts[1]) {
      let rawSuggestions = parts[1].trim();
      // 移除各種可能的引導文字
      rawSuggestions = rawSuggestions
        .replace(/後續建議.*[:：]/g, '')
        .replace(/接下來您可能想知道的問題.*[:：]/g, '')
        .replace(/延伸閱讀.*[:：]/g, '')
        .replace(/相關問題.*[:：]/g, '')
        .replace(/您可能還想了解.*[:：]/g, '')
        .replace(/建議.*[:：]/g, '')
        .replace(/｜/g, '|')
        .replace(/\n/g, '|');
      suggestions = rawSuggestions.split('|').map(s => s.trim()).map(s => s.replace(/^\d+\.\s*/, '')).filter(s => s.length > 0);
    }
    return { content, suggestions };
  };

  return (
    <div className="main-container">
      {/* 左欄：選單區 */}
      <div className="sidebar-menu">
        <div className="brand-title">iNephro 衛教諮詢室</div>

        {/* 1. 固定精選主題 */}
        <div style={{fontSize:'12px', color:'#aaa', marginBottom:'5px', paddingLeft:'10px'}}>📌 精選主題</div>
        {Object.keys(TOPIC_DATA).map(key => (
          <div 
            key={key}
            className={`menu-item ${activeCategory === key ? 'active' : ''}`}
            onClick={() => handleMenuClick(key)}
          >
            ⭐ {TOPIC_DATA[key].title}
          </div>
        ))}

        <hr style={{borderColor: 'rgba(255,255,255,0.1)', margin: '15px 0'}} />

        {/* 2. 隨機熱搜主題 */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingRight:'10px', marginBottom:'5px'}}>
           <div style={{fontSize:'12px', color:'#aaa', paddingLeft:'10px'}}>🎲 今日熱搜</div>
           <button onClick={refreshTopics} style={{background:'none', border:'none', color:'#3498db', cursor:'pointer', fontSize:'12px'}}>
             🔄 換一組
           </button>
        </div>

        {randomTopics.map((keyword, index) => (
          <div 
            key={index}
            className={`menu-item ${activeCategory === keyword ? 'active' : ''}`}
            onClick={() => handleMenuClick(keyword)}
          >
            📄 {keyword}
          </div>
        ))}

        <div style={{marginTop: 'auto', fontSize: '12px', color: '#aaa', textAlign: 'center'}}>Dr. AI v2.2</div>
      </div>

      {/* 中欄：對話區 */}
      <div className="center-stage">
        <div className="chat-scroll-area">
          {messages.map((msg, index) => {
            const { content, suggestions } = parseMessage(msg.text);
            return (
              <div key={index} className={`message-wrapper ${msg.role}`}>
                {msg.image && (
                  <div className="message-image-container">
                    <img
                      src={msg.image}
                      alt="衛教圖"
                      className="chat-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className={`message ${msg.role}`}>
                  <div className="markdown-content">
                    {msg.isThinking ? (
                      <>
                        {content}
                        <span className="thinking-animation">
                          <span className="dot"></span>
                          <span className="dot"></span>
                          <span className="dot"></span>
                        </span>
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

      {/* 右欄：3D 醫師 */}
      <div className="right-panel">
        <div className="doctor-status">{isDoctorSpeaking ? '🗣️ 解說中... (點擊停止)' : '👂 聆聽中'}</div>
        <div className="doctor-container">
          <Doctor3D isSpeaking={isDoctorSpeaking} onStopSpeaking={stopSpeaking} />
        </div>
      </div>
    </div>
  );
}

export default App;