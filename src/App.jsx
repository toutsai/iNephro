// src/App.jsx - 最終完整版 (圖文衛教 + 隨機關鍵字 + 語音互動)
import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Doctor3D from './Doctor3D';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';

// --- 1. 固定精選主題 (有圖) ---
const TOPIC_DATA = {
  'aki': {
    title: '急性腎損傷 (AKI)',
    image: null, 
    prompt: '請簡單介紹急性腎損傷(AKI)的定義與常見原因。'
  },
  'ckd': {
    title: '慢性腎臟病 (CKD)',
    image: null,
    prompt: '請說明慢性腎臟病(CKD)的五個分期是什麼？'
  },
  'electrolytes': { 
    title: '電解質不平衡',
    image: null, 
    prompt: '請說明常見的電解質不平衡症狀。'
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
// 從環境變數讀取 Key (如果在本地端沒有設定，就讀取空字串)
const DANGER_OPENAI_KEY = import.meta.env.VITE_OPENAI_KEY || ""; 

  // --- State ---
  const [activeCategory, setActiveCategory] = useState('home');
  const [randomTopics, setRandomTopics] = useState([]); // 存隨機選出的字
  const [messages, setMessages] = useState([
    { 
      role: 'doctor', 
      text: '您好，我是 iNephro 智能醫師。您可以點選左側主題，或直接問我問題。',
    }
  ]);
  const [input, setInput] = useState('');
  const [isDoctorSpeaking, setIsDoctorSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);
  const [selectedVoice, setSelectedVoice] = useState(null);

  // --- 初始化與隨機邏輯 ---
  
  // 隨機抽籤函式
  const refreshTopics = () => {
    const shuffled = [...KEYWORD_POOL].sort(() => 0.5 - Math.random());
    setRandomTopics(shuffled.slice(0, 6)); // 取前 6 個
  };

  // 一進來就先抽一次
  useEffect(() => {
    refreshTopics();
  }, []);

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
    const textToSpeak = rawText.split('///')[0]; // 過濾掉按鈕指令
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

  const callAI = async (userPrompt, contextImage = null) => {
    if (!DANGER_OPENAI_KEY.startsWith("sk-")) return speak("請設定 API Key");

    try {
      const openai = new OpenAI({ apiKey: DANGER_OPENAI_KEY, dangerouslyAllowBrowser: true });
      
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

      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map(m => ({ role: m.role === 'doctor' ? 'assistant' : 'user', content: m.text })),
          { role: "user", content: userPrompt }
        ],
        model: "gpt-4o-mini",
      });

      const reply = completion.choices[0].message.content;
      setMessages(prev => [...prev, { role: 'doctor', text: reply }]);
      speak(reply);

    } catch (error) {
      console.error(error);
    }
  };

  const handleSend = (text = null) => {
    const question = text || input;
    if (!question.trim()) return;

    setMessages(prev => [...prev, { role: 'patient', text: question }]);
    setInput('');
    setIsDoctorSpeaking(false);
    
    setMessages(prev => [...prev, { role: 'doctor', text: '...' }]);
    setTimeout(() => {
      setMessages(prev => prev.slice(0, -1));
      callAI(question);
    }, 600);
  };

  // ★★★ 修改後的選單點擊處理 (整合隨機功能) ★★★
  const handleMenuClick = (keyOrKeyword) => {
    setActiveCategory(keyOrKeyword);

    let title = "";
    let image = "";
    let prompt = "";

    // 判斷是「固定主題」還是「隨機關鍵字」
    if (TOPIC_DATA[keyOrKeyword]) {
      // 是固定主題
      const data = TOPIC_DATA[keyOrKeyword];
      title = data.title;
      image = data.image;
      prompt = data.prompt;
    } else {
      // 是隨機關鍵字
      title = keyOrKeyword;
      image = DEFAULT_IMAGE; // 用通用圖片
      prompt = `請詳細介紹關於「${keyOrKeyword}」的腎臟科衛教知識，包含定義、症狀與照護重點。`;
    }

    const imageMessage = {
      role: 'doctor',
      text: `好的，關於「${title}」，這裡有一些資料供您參考：`,
      image: image
    };
    
    setMessages(prev => [...prev, imageMessage]);
    setMessages(prev => [...prev, { role: 'doctor', text: '...' }]);
    
    setTimeout(() => {
      setMessages(prev => prev.slice(0, -1));
      callAI(prompt, image);
    }, 800);
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
    const content = parts[0].trim();
    let suggestions = [];
    
    if (parts[1]) {
      let rawSuggestions = parts[1].trim();
      rawSuggestions = rawSuggestions.replace(/後續建議.*[:：]/g, '');
      rawSuggestions = rawSuggestions.replace(/｜/g, '|').replace(/\n/g, '|');
      suggestions = rawSuggestions.split('|').map(s => s.trim()).map(s => s.replace(/^\d+\.\s*/, '')).filter(s => s.length > 0);
    }
    return { content, suggestions };
  };

  return (
    <div className="main-container">
      {/* 左欄：選單區 */}
      <div className="sidebar-menu">
        <div className="brand-title">iNephro</div>
        
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
        <div className="stage-header">
          <h2>iNephro 衛教諮詢室</h2>
        </div>

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
                  <div className="markdown-content"><ReactMarkdown>{content}</ReactMarkdown></div>
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
        <div className="doctor-status">{isDoctorSpeaking ? '🗣️ 解說中...' : '👂 聆聽中'}</div>
        <div className="doctor-container">
          <Doctor3D isSpeaking={isDoctorSpeaking} />
        </div>
      </div>
    </div>
  );
}

export default App;