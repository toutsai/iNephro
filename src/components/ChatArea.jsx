import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { parseMessage } from '../utils/parseMessage';

function ChatArea({
  messages,
  input,
  setInput,
  handleSend,
  handleVoiceInput,
  isRecording,
  isDoctorSpeaking,
  className = '',
  revealedIndex = -1,
  currentSpeechText = '',
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, revealedIndex]);

  // 判斷是否為最後一則醫師訊息（用於 KTV 字幕）
  const lastDoctorIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'doctor' && !messages[i].isThinking) return i;
    }
    return -1;
  })();

  return (
    <div className={`center-stage ${className}`}>
      <div className="chat-scroll-area">
        {messages.map((msg, index) => {
          const { content, suggestions } = parseMessage(msg.text);

          // KTV 字幕：最後一則醫師訊息 + 正在說話時，逐字顯示
          const isKTV = isDoctorSpeaking && index === lastDoctorIdx && revealedIndex >= 0 && currentSpeechText;
          let displayContent = content;
          if (isKTV && revealedIndex < currentSpeechText.length) {
            // 取已顯示的部分文字（保留 markdown 格式）
            displayContent = currentSpeechText.substring(0, revealedIndex);
          }

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
              <div className={`message ${msg.role} ${isKTV ? 'ktv-active' : ''}`}>
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
                    <ReactMarkdown>{displayContent}</ReactMarkdown>
                  )}
                  {isKTV && <span className="ktv-cursor">|</span>}
                </div>
              </div>
              {msg.role === 'doctor' && suggestions.length > 0 && !isKTV && (
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
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isRecording ? "聆聽中..." : "用講ㄟ也會通，打字輸入也可以"}
          />
          <button className="icon-btn" onClick={() => handleSend()} style={{color: 'var(--accent)'}}>➤</button>
        </div>
      </div>
    </div>
  );
}

export default ChatArea;
