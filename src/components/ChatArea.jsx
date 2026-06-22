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
  isSending = false,
  topPanel = null,
}) {
  const messagesEndRef = useRef(null);

  const getMessageVariant = (msg) => {
    if (msg.confidence === 'safety') return 'safety';
    if (msg.confidence === 'unavailable') return 'unavailable';
    return 'standard';
  };

  const getVariantLabel = (variant) => {
    if (variant === 'safety') return '即時就醫提醒';
    if (variant === 'unavailable') return '知識庫暫時無法回覆';
    return '';
  };

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
      {topPanel}
      <div className="chat-scroll-area">
        {messages.map((msg, index) => {
          const { content, suggestions } = parseMessage(msg.text);
          const variant = getMessageVariant(msg);
          const variantLabel = getVariantLabel(variant);
          const suppressSuggestions = variant !== 'standard';

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
              <div className={`message ${msg.role} ${isKTV ? 'ktv-active' : ''} ${variant !== 'standard' ? `message-${variant}` : ''}`}>
                <div className="markdown-content">
                  {variantLabel && !msg.isThinking && (
                    <div className="message-status-label">{variantLabel}</div>
                  )}
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
              {msg.role === 'doctor' && suggestions.length > 0 && !isKTV && !suppressSuggestions && (
                <div className="suggestion-chips">
                  {suggestions.map((s, i) => (
                    <button key={i} className="chip" onClick={() => handleSend(s)} disabled={isSending}>{s}</button>
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
          <button className={`icon-btn ${isRecording ? 'recording' : ''}`} onClick={handleVoiceInput} disabled={isSending}>🎙️</button>
          <input
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isSending ? "正在查詢知識庫..." : (isRecording ? "聆聽中..." : "用講ㄟ也會通，打字輸入也可以")}
            disabled={isSending}
          />
          <button className="icon-btn" onClick={() => handleSend()} style={{color: 'var(--accent)'}} disabled={isSending}>
            {isSending ? '⏳' : '➤'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatArea;
