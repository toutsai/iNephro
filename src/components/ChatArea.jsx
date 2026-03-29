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
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
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
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isRecording ? "聆聽中..." : "用講ㄟ也會通，打字輸入也可以"}
          />
          <button className="icon-btn" onClick={() => handleSend()} style={{color: '#3498db'}}>➤</button>
        </div>
      </div>
    </div>
  );
}

export default ChatArea;
