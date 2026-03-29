import React from 'react';
import { TOPIC_DATA } from '../constants/topics';
import NutritionResult from './NutritionResult';

function Sidebar({
  activeCategory,
  handleMenuClick,
  refreshTopics,
  randomTopics,
  nutritionQuery,
  setNutritionQuery,
  handleNutritionSearch,
  isSearchingNutrition,
  nutritionResults,
  onShowEGFR,
  onClearMessages,
  fontSize,
  onFontSizeChange,
  darkMode,
  onToggleDarkMode,
}) {
  return (
    <div className="sidebar-menu">
      <div className="brand-title">iNephro 衛教諮詢室</div>

      {/* 1. 固定精選主題 */}
      <div style={{fontSize:'12px', color:'#aaa', marginBottom:'3px', paddingLeft:'10px'}}>📌 精選主題</div>
      {Object.keys(TOPIC_DATA).map(key => (
        <div
          key={key}
          className={`menu-item compact ${activeCategory === key ? 'active' : ''}`}
          onClick={() => handleMenuClick(key)}
        >
          ⭐ {TOPIC_DATA[key].title}
        </div>
      ))}

      <hr style={{borderColor: 'rgba(255,255,255,0.1)', margin: '10px 0'}} />

      {/* 2. 營養查詢 */}
      <div style={{fontSize:'12px', color:'#aaa', marginBottom:'5px', paddingLeft:'10px'}}>🥗 營養查詢(源自食藥署食品營養成分資料庫)</div>
      <div className="nutrition-search-box">
        <input
          type="text"
          className="nutrition-input"
          placeholder="輸入食物名稱 (例：香蕉)"
          value={nutritionQuery}
          onChange={(e) => setNutritionQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleNutritionSearch()}
        />
        <button
          className="nutrition-search-btn"
          onClick={() => handleNutritionSearch()}
          disabled={isSearchingNutrition}
        >
          {isSearchingNutrition ? '⏳' : '🔍'}
        </button>
      </div>

      {/* 營養查詢結果 */}
      <NutritionResult nutritionResults={nutritionResults} />

      <hr style={{borderColor: 'rgba(255,255,255,0.1)', margin: '10px 0'}} />

      {/* 3. 隨機熱搜主題 */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingRight:'10px', marginBottom:'3px'}}>
         <div style={{fontSize:'12px', color:'#aaa', paddingLeft:'10px'}}>🎲 今日熱搜</div>
         <button onClick={refreshTopics} style={{background:'none', border:'none', color:'#3498db', cursor:'pointer', fontSize:'12px'}}>
           🔄 換一組
         </button>
      </div>

      {randomTopics.map((keyword, index) => (
        <div
          key={index}
          className={`menu-item compact ${activeCategory === keyword ? 'active' : ''}`}
          onClick={() => handleMenuClick(keyword)}
        >
          📄 {keyword}
        </div>
      ))}

      <hr style={{borderColor: 'rgba(255,255,255,0.1)', margin: '10px 0'}} />

      {/* 4. 工具 */}
      <div style={{fontSize:'12px', color:'#aaa', marginBottom:'5px', paddingLeft:'10px'}}>🔧 工具</div>
      <div
        className="menu-item compact"
        onClick={onShowEGFR}
        style={{cursor:'pointer'}}
      >
        🧮 eGFR 計算器
      </div>
      <div
        className="menu-item compact"
        onClick={onClearMessages}
        style={{cursor:'pointer'}}
      >
        🗑️ 清除對話記錄
      </div>

      {/* 5. 字體大小控制 + 深色模式 */}
      <div style={{padding:'10px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}>
        <span className="font-size-label">字體</span>
        <button className="font-size-btn" onClick={() => onFontSizeChange(-1)} aria-label="縮小字體">A-</button>
        <span className="font-size-label">{fontSize}px</span>
        <button className="font-size-btn" onClick={() => onFontSizeChange(1)} aria-label="放大字體">A+</button>
      </div>
      <div style={{padding:'0 10px 10px', display:'flex', justifyContent:'center'}}>
        <button className="theme-toggle-btn" onClick={onToggleDarkMode} aria-label="切換深色模式">
          {darkMode ? '☀️ 亮色' : '🌙 深色'}
        </button>
      </div>

      <div style={{marginTop: 'auto', fontSize: '12px', color: '#aaa', textAlign: 'center'}}>Dr. AI v2.3</div>
    </div>
  );
}

export default Sidebar;
