// src/App.jsx - Edge Function 版本（雲端快取 + AI）
import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import ErrorBoundary from './components/ErrorBoundary';
const Doctor3D = React.lazy(() => import('./Doctor3D'));

import { TOPIC_DATA, KEYWORD_POOL } from './constants/topics';
import { useSpeech } from './hooks/useSpeech';
import { useChat } from './hooks/useChat';
import { useNutrition } from './hooks/useNutrition';

import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import NutritionModal from './components/NutritionModal';

function App() {
  const [activeCategory, setActiveCategory] = useState('home');
  const [randomTopics, setRandomTopics] = useState([]);
  const [isDoctorMinimized, setIsDoctorMinimized] = useState(false);

  // --- Hooks ---
  const {
    isDoctorSpeaking, setIsDoctorSpeaking,
    isRecording,
    speak, stopSpeaking, handleVoiceInput,
  } = useSpeech();

  const {
    messages, setMessages, input, setInput,
    callAI, handleSend,
  } = useChat(speak, () => setIsDoctorSpeaking(false));

  const {
    nutritionQuery, setNutritionQuery,
    nutritionResults, isSearchingNutrition,
    showNutritionModal, setShowNutritionModal,
    handleNutritionSearch,
  } = useNutrition();

  // --- Random topics ---
  const refreshTopics = useCallback(() => {
    const shuffled = [...KEYWORD_POOL].sort(() => 0.5 - Math.random());
    setRandomTopics(shuffled.slice(0, 6));
  }, []);

  useEffect(() => {
    refreshTopics();
  }, [refreshTopics]);

  // --- Menu click handler ---
  const handleMenuClick = (keyOrKeyword) => {
    setActiveCategory(keyOrKeyword);

    let prompt = "";

    if (TOPIC_DATA[keyOrKeyword]) {
      prompt = TOPIC_DATA[keyOrKeyword].prompt;
    } else {
      prompt = `請詳細介紹關於「${keyOrKeyword}」的腎臟科衛教知識，包含定義、症狀與照護重點。`;
    }

    // 顯示「思考中」訊息（不顯示圖片）
    setMessages(prev => [...prev, { role: 'doctor', text: '🔍 正在查詢知識庫...', isThinking: true }]);

    // 直接調用 AI，在 callAI 內部會移除思考提示
    callAI(prompt);
  };

  const lastDoctorText = messages.filter(m => m.role === 'doctor').slice(-1)[0]?.text || '';

  return (
    <div className="main-container">
      {/* 快速主題橫向滑動 (行動版) */}
      <div className="quick-topics-container">
        <div className="quick-topics">
          {Object.keys(TOPIC_DATA).map(key => (
            <div
              key={key}
              className={`quick-topic-chip ${activeCategory === key ? 'active' : ''}`}
              onClick={() => handleMenuClick(key)}
            >
              ⭐ {TOPIC_DATA[key].title}
            </div>
          ))}
          {randomTopics.map((keyword, index) => (
            <div
              key={`quick-${index}`}
              className={`quick-topic-chip ${activeCategory === keyword ? 'active' : ''}`}
              onClick={() => handleMenuClick(keyword)}
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
        handleNutritionSearch={handleNutritionSearch}
        isSearchingNutrition={isSearchingNutrition}
        nutritionResults={nutritionResults}
      />

      {/* 中欄：對話區 */}
      <ChatArea
        messages={messages}
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        handleVoiceInput={() => handleVoiceInput(setInput)}
        isRecording={isRecording}
        isDoctorSpeaking={isDoctorSpeaking}
      />

      {/* 右欄：3D 醫師 (桌面版) */}
      <div className="right-panel">
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

      {/* 右下角浮動 3D 醫師 (行動版) */}
      <div className={`doctor-floating ${isDoctorSpeaking ? 'speaking' : ''} ${isDoctorMinimized ? 'minimized' : ''}`}>
        <button
          className="doctor-close-btn"
          onClick={() => setIsDoctorMinimized(!isDoctorMinimized)}
          title={isDoctorMinimized ? '展開醫師' : '縮小醫師'}
        >
          {isDoctorMinimized ? '➕' : '➖'}
        </button>
        <ErrorBoundary fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#999',fontSize:'12px'}}>載入失敗</div>}>
          <React.Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#999',fontSize:'12px'}}>載入中...</div>}>
            <Doctor3D
              isSpeaking={isDoctorSpeaking}
              onStopSpeaking={stopSpeaking}
              isMobile={true}
              currentText={lastDoctorText}
            />
          </React.Suspense>
        </ErrorBoundary>
      </div>

      {/* 行動版營養查詢浮動按鈕 */}
      <button
        className="nutrition-floating-btn"
        onClick={() => setShowNutritionModal(true)}
        title="營養查詢"
      >
        🥗
      </button>

      {/* 行動版營養查詢彈窗 */}
      <NutritionModal
        show={showNutritionModal}
        onClose={() => setShowNutritionModal(false)}
        nutritionQuery={nutritionQuery}
        setNutritionQuery={setNutritionQuery}
        handleNutritionSearch={handleNutritionSearch}
        isSearchingNutrition={isSearchingNutrition}
        nutritionResults={nutritionResults}
      />
    </div>
  );
}

export default App;
