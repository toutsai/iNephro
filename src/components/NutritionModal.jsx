import React from 'react';
import NutritionResult from './NutritionResult';

function NutritionModal({
  show,
  onClose,
  nutritionQuery,
  setNutritionQuery,
  handleNutritionSearch,
  isSearchingNutrition,
  nutritionResults,
}) {
  if (!show) return null;

  return (
    <div className="nutrition-modal-overlay" onClick={onClose}>
      <div className="nutrition-modal" onClick={(e) => e.stopPropagation()}>
        <div className="nutrition-modal-header">
          <h3>🥗 營養查詢</h3>
          <button className="nutrition-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="nutrition-modal-body">
          <div className="nutrition-search-box">
            <input
              type="text"
              className="nutrition-input"
              placeholder="輸入食物名稱 (例：香蕉、芭樂)"
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
        </div>
      </div>
    </div>
  );
}

export default NutritionModal;
