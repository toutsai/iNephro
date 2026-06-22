// src/App.jsx - Edge Function 版本（雲端快取 + AI）
import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import ErrorBoundary from './components/ErrorBoundary';
const Doctor3D = React.lazy(() => import('./Doctor3D'));

import { TOPIC_DATA, KEYWORD_POOL, PRESENTER_TOPICS } from './constants/topics';
import { useSpeech } from './hooks/useSpeech';
import { useChat } from './hooks/useChat';
import { useNutrition } from './hooks/useNutrition';

import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import NutritionModal from './components/NutritionModal';
import NutritionResult from './components/NutritionResult';
import EGFRCalculator from './components/EGFRCalculator';

function getRandomTopics() {
  const shuffled = [...KEYWORD_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 6);
}

function App() {
  const [activeCategory, setActiveCategory] = useState('home');
  const [randomTopics, setRandomTopics] = useState(() => getRandomTopics());
  const [showEGFR, setShowEGFR] = useState(false);
  const [showNutritionPopup, setShowNutritionPopup] = useState(false);
  const [mobileTab, setMobileTab] = useState('chat');
  const [presenterTopicKey, setPresenterTopicKey] = useState(null);
  const [fontSize, setFontSize] = useState(() => {
    return parseInt(localStorage.getItem('inephro_fontsize') || '15', 10);
  });
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('inephro_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
  });

  // --- Hooks ---
  const {
    isDoctorSpeaking, setIsDoctorSpeaking,
    isRecording,
    speak, stopSpeaking, handleVoiceInput,
    revealedIndex, currentSpeechText,
  } = useSpeech();

  const {
    messages, setMessages, input, setInput,
    callAI, handleSend, clearMessages, isSending,
  } = useChat(speak, () => setIsDoctorSpeaking(false));

  // --- Font size control ---
  const adjustFontSize = (delta) => {
    setFontSize(prev => {
      const next = Math.min(22, Math.max(12, prev + delta));
      localStorage.setItem('inephro_fontsize', String(next));
      document.documentElement.style.setProperty('--font-size-base', `${next}px`);
      document.documentElement.style.setProperty('--font-size-small', `${next - 2}px`);
      document.documentElement.style.setProperty('--font-size-chip', `${next - 1}px`);
      document.documentElement.style.setProperty('--font-size-input', `${next + 1}px`);
      return next;
    });
  };

  // --- Dark mode ---
  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('inephro_theme', next ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', next ? 'dark' : '');
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : '');
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-size-base', `${fontSize}px`);
    document.documentElement.style.setProperty('--font-size-small', `${fontSize - 2}px`);
    document.documentElement.style.setProperty('--font-size-chip', `${fontSize - 1}px`);
    document.documentElement.style.setProperty('--font-size-input', `${fontSize + 1}px`);
  }, [fontSize]);

  const {
    nutritionQuery, setNutritionQuery,
    nutritionResults, isSearchingNutrition,
    handleNutritionSearch,
  } = useNutrition();

  // 營養查詢完成後自動彈出結果
  const handleNutritionSearchWithPopup = async (query) => {
    await handleNutritionSearch(query);
    setShowNutritionPopup(true);
  };

  // --- Random topics ---
  const refreshTopics = useCallback(() => {
    setRandomTopics(getRandomTopics());
  }, []);

  // --- Menu click handler ---
  const handleMenuClick = (keyOrKeyword) => {
    if (isSending) return;

    setActiveCategory(keyOrKeyword);

    let prompt = "";

    if (TOPIC_DATA[keyOrKeyword]) {
      prompt = TOPIC_DATA[keyOrKeyword].prompt;
      setPresenterTopicKey(keyOrKeyword);
    } else {
      prompt = `請詳細介紹關於「${keyOrKeyword}」的腎臟科衛教知識，包含定義、症狀與照護重點。`;
      setPresenterTopicKey(null);
    }

    // 顯示「思考中」訊息（不顯示圖片）
    setMessages(prev => [...prev, { role: 'doctor', text: '🔍 正在查詢知識庫...', isThinking: true }]);

    // 直接調用 AI，在 callAI 內部會移除思考提示
    callAI(prompt);
  };

  const lastDoctorText = messages.filter(m => m.role === 'doctor').slice(-1)[0]?.text || '';
  const presenterTopic = presenterTopicKey ? PRESENTER_TOPICS[presenterTopicKey] : null;
  const presenterPanel = presenterTopic ? (
    <section className="presenter-panel" aria-label={`${presenterTopic.title} 講解模式`}>
      <div className="presenter-doctor-stage">
        <ErrorBoundary fallback={<div className="presenter-fallback">3D 醫師載入失敗</div>}>
          <React.Suspense fallback={<div className="presenter-fallback">載入中...</div>}>
            <Doctor3D
              isSpeaking={isDoctorSpeaking}
              onStopSpeaking={stopSpeaking}
              currentText={lastDoctorText}
            />
          </React.Suspense>
        </ErrorBoundary>
        <div className="presenter-doctor-status">
          {isDoctorSpeaking ? '講解中' : '待命中'}
        </div>
      </div>
      <div className="presenter-brief">
        <div className="presenter-toolbar">
          <span className="presenter-mode-label">講解模式</span>
          <button className="presenter-close-btn" onClick={() => setPresenterTopicKey(null)}>
            回到對話
          </button>
        </div>
        <div className="presenter-title-row">
          <span className="presenter-topic-label">{presenterTopic.label}</span>
          <h2>{presenterTopic.title}</h2>
        </div>
        <p className="presenter-subtitle">{presenterTopic.subtitle}</p>
        <div className="presenter-step-grid">
          {presenterTopic.steps.map((step, index) => (
            <article key={step.title} className="presenter-step-card">
              <span className="presenter-step-number">{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  ) : null;

  return (
    <div className="main-container">
      {/* 行動版頂部：歡迎訊息 + 免責聲明 */}
      <div className="mobile-welcome-bar">
        <div className="mobile-welcome-text">
          iNephro 智能醫師 — 腎臟科衛教諮詢
        </div>
        <div className="mobile-welcome-disclaimer">
          ⚠️ 衛教輔助工具，非醫療診斷。請遵循主治醫師建議。
        </div>
      </div>

      {/* 桌面版：快速主題橫向滑動（行動版隱藏，改到底部導航上方） */}
      <div className="quick-topics-container desktop-only">
        <div className="quick-topics">
          {Object.keys(TOPIC_DATA).map(key => (
            <div
              key={key}
              className={`quick-topic-chip ${activeCategory === key ? 'active' : ''} ${isSending ? 'disabled' : ''}`}
              onClick={() => handleMenuClick(key)}
              title={TOPIC_DATA[key].prompt}
              aria-disabled={isSending}
            >
              ⭐ {TOPIC_DATA[key].title}
            </div>
          ))}
          {randomTopics.map((keyword, index) => (
            <div
              key={`quick-${index}`}
              className={`quick-topic-chip ${activeCategory === keyword ? 'active' : ''} ${isSending ? 'disabled' : ''}`}
              onClick={() => handleMenuClick(keyword)}
              title={`請詳細介紹關於「${keyword}」的腎臟科衛教知識`}
              aria-disabled={isSending}
            >
              {keyword}
            </div>
          ))}
        </div>
      </div>

      {/* 左欄：選單區 (桌面版) */}
      <Sidebar
        activeCategory={activeCategory}
        handleMenuClick={handleMenuClick}
        refreshTopics={refreshTopics}
        randomTopics={randomTopics}
        nutritionQuery={nutritionQuery}
        setNutritionQuery={setNutritionQuery}
        handleNutritionSearch={handleNutritionSearchWithPopup}
        isSearchingNutrition={isSearchingNutrition}
        isSending={isSending}
        onShowEGFR={() => setShowEGFR(true)}
        onClearMessages={clearMessages}
        fontSize={fontSize}
        onFontSizeChange={adjustFontSize}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* 行動版：對話頁內嵌 3D 醫師迷你面板 */}
      {mobileTab === 'chat' && (
        <div className={`mobile-doctor-mini ${isDoctorSpeaking ? 'speaking' : 'idle'}`}>
          <div className="mobile-doctor-mini-canvas">
            <ErrorBoundary fallback={null}>
              <React.Suspense fallback={null}>
                <Doctor3D
                  isSpeaking={isDoctorSpeaking}
                  onStopSpeaking={stopSpeaking}
                  isMobile={true}
                  currentText={lastDoctorText}
                />
              </React.Suspense>
            </ErrorBoundary>
          </div>
          <div className="mobile-doctor-mini-status">
            {isDoctorSpeaking ? '🗣️ 解說中' : '👂 待命中'}
          </div>
        </div>
      )}

      {/* 中欄：對話區 (行動版僅在 chat tab 顯示) */}
      <ChatArea
        className={mobileTab !== 'chat' ? 'mobile-hidden' : ''}
        messages={messages}
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        handleVoiceInput={() => handleVoiceInput(setInput)}
        isRecording={isRecording}
        isDoctorSpeaking={isDoctorSpeaking}
        revealedIndex={revealedIndex}
        currentSpeechText={currentSpeechText}
        isSending={isSending}
        topPanel={presenterPanel}
      />

      {/* 右欄：3D 醫師 (桌面版) */}
      <div className={`right-panel ${presenterTopic ? 'presenter-hidden' : ''}`}>
        <div className="doctor-status">{isDoctorSpeaking ? '🗣️ 解說中... (點擊停止)' : '👂 聆聽中'}</div>
        <div className="doctor-container">
          <ErrorBoundary fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#999',fontSize:'14px'}}>3D 模型載入失敗</div>}>
            <React.Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#999',fontSize:'14px'}}>載入中...</div>}>
              <Doctor3D
                isSpeaking={isDoctorSpeaking}
                onStopSpeaking={stopSpeaking}
                currentText={lastDoctorText}
              />
            </React.Suspense>
          </ErrorBoundary>
        </div>
      </div>

      {/* 行動版：Tab 面板 (非 chat 時顯示) */}
      {mobileTab === 'nutrition' && (
        <div className="mobile-panel">
          <div className="mobile-panel-header">
            <h3>🥗 營養查詢</h3>
            <span style={{fontSize:'11px',color:'var(--text-muted)'}}>源自食藥署食品營養成分資料庫</span>
          </div>
          <div className="mobile-panel-body">
            <div className="nutrition-search-box" style={{background:'var(--bg-input)',borderRadius:'12px',padding:'10px'}}>
              <input
                type="text"
                className="nutrition-input"
                placeholder="輸入食物名稱 (例：香蕉、芭樂)"
                value={nutritionQuery}
                onChange={(e) => setNutritionQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNutritionSearch()}
                style={{background:'var(--bg-card)',color:'var(--text-primary)',border:'1px solid var(--border-color)'}}
              />
              <button
                className="nutrition-search-btn"
                onClick={() => handleNutritionSearch()}
                disabled={isSearchingNutrition}
              >
                {isSearchingNutrition ? '⏳' : '🔍'}
              </button>
            </div>
            {nutritionResults && (
              <div className="nutrition-results" style={{background:'var(--bg-chat)',marginTop:'10px'}}>
                {nutritionResults.error ? (
                  <div className="nutrition-error">❌ {nutritionResults.error}</div>
                ) : nutritionResults.count === 0 ? (
                  <div className="nutrition-empty">😢 找不到「{nutritionResults.query}」<br/>請嘗試其他關鍵字</div>
                ) : (
                  <div className="nutrition-items">
                    {nutritionResults.results.map((food, idx) => (
                      <div key={idx} className="nutrition-item">
                        <div className="nutrition-item-header">
                          <strong>{food.name}</strong>
                          <span className="nutrition-category">{food.category}</span>
                        </div>
                        <div className="nutrition-values">
                          <div className="nutrition-value"><span className="label">鈉</span><span className="value">{food.sodium} mg</span></div>
                          <div className="nutrition-value"><span className="label">鉀</span><span className="value">{food.potassium} mg</span></div>
                          <div className="nutrition-value"><span className="label">磷</span><span className="value">{food.phosphorus} mg</span></div>
                          <div className="nutrition-value"><span className="label">鈣</span><span className="value">{food.calcium} mg</span></div>
                          <div className="nutrition-value"><span className="label">鎂</span><span className="value">{food.magnesium} mg</span></div>
                        </div>
                        {food.warnings && food.warnings.length > 0 && (
                          <div className="nutrition-warnings">
                            {food.warnings.map((w, wIdx) => (
                              <div key={wIdx} className={`warning ${w.level}`}>{w.icon} {w.message}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="nutrition-note">💡 數值為每 100g 可食部分</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {mobileTab === 'egfr' && (
        <div className="mobile-panel">
          <div className="mobile-panel-body" style={{display:'flex',justifyContent:'center',padding:'20px'}}>
            <EGFRCalculator />
          </div>
        </div>
      )}

      {/* 行動版底部導航列（含展開式主題面板） */}
      <div className="mobile-bottom-section">
        {/* 展開式主題面板 */}
        {mobileTab === 'featured' && (
          <div className="mobile-topics-panel">
            <div className="mobile-topics-panel-title">⭐ 精選主題</div>
            <div className="mobile-topics-grid">
              {Object.keys(TOPIC_DATA).map(key => (
                <div key={key} className="mobile-topic-item"
                  title={TOPIC_DATA[key].prompt}
                  aria-disabled={isSending}
                  onClick={() => { setMobileTab('chat'); handleMenuClick(key); }}>
                  {TOPIC_DATA[key].title}
                </div>
              ))}
            </div>
          </div>
        )}
        {mobileTab === 'trending' && (
          <div className="mobile-topics-panel">
            <div className="mobile-topics-panel-title" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>🔥 今日熱搜</span>
              <button onClick={refreshTopics} style={{background:'none',border:'none',color:'var(--accent)',fontSize:'13px',cursor:'pointer'}}>🔄 換一組</button>
            </div>
            <div className="mobile-topics-grid">
              {randomTopics.map((keyword, index) => (
                <div key={index} className="mobile-topic-item"
                  title={`請詳細介紹關於「${keyword}」的腎臟科衛教知識`}
                  aria-disabled={isSending}
                  onClick={() => { setMobileTab('chat'); handleMenuClick(keyword); }}>
                  {keyword}
                </div>
              ))}
            </div>
          </div>
        )}
        {/* 導航列 */}
        <nav className="mobile-bottom-nav">
          {[
            { id: 'chat', icon: '💬', label: '對話' },
            { id: 'featured', icon: '⭐', label: '精選' },
            { id: 'trending', icon: '🔥', label: '熱搜' },
            { id: 'nutrition', icon: '🥗', label: '營養' },
            { id: 'egfr', icon: '🧮', label: 'eGFR' },
          ].map(tab => (
            <button
              key={tab.id}
              className={`mobile-nav-item ${mobileTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                if ((tab.id === 'featured' || tab.id === 'trending') && mobileTab === tab.id) {
                  setMobileTab('chat'); // 再次點擊收合
                } else {
                  setMobileTab(tab.id);
                }
              }}
            >
              <span className="mobile-nav-icon">{tab.icon}</span>
              <span className="mobile-nav-label">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 營養查詢結果彈窗（桌面+行動版共用） */}
      {showNutritionPopup && nutritionResults && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0,
          background:'rgba(0,0,0,0.4)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:2000, padding:'20px',
        }} onClick={() => setShowNutritionPopup(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background:'var(--bg-card)', borderRadius:'16px', padding:'20px',
            maxWidth:'500px', width:'100%', maxHeight:'80vh', overflowY:'auto',
            boxShadow:'var(--shadow-elevated)', border:'1px solid var(--border-color)',
          }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
              <h3 style={{margin:0, color:'var(--text-primary)', fontSize:'16px'}}>
                🥗 「{nutritionResults.query}」查詢結果（{nutritionResults.count || 0} 筆）
              </h3>
              <button onClick={() => setShowNutritionPopup(false)} style={{
                background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'var(--text-muted)', padding:'4px'
              }}>✕</button>
            </div>
            <NutritionResult nutritionResults={nutritionResults} />
          </div>
        </div>
      )}

      {/* eGFR 計算器彈窗 */}
      {showEGFR && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0,
          background:'rgba(0,0,0,0.5)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:2000, padding:'20px',
        }} onClick={() => setShowEGFR(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <EGFRCalculator onClose={() => setShowEGFR(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
