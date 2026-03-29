import React from 'react';

function NutritionResult({ nutritionResults }) {
  if (!nutritionResults) return null;

  if (nutritionResults.error) {
    return (
      <div className="nutrition-results">
        <div className="nutrition-error">❌ {nutritionResults.error}</div>
      </div>
    );
  }

  if (nutritionResults.count === 0) {
    return (
      <div className="nutrition-results">
        <div className="nutrition-empty">😢 找不到「{nutritionResults.query}」<br/>請嘗試其他關鍵字</div>
      </div>
    );
  }

  return (
    <div className="nutrition-results">
      <div className="nutrition-items">
        {nutritionResults.results.map((food, idx) => (
          <div key={idx} className="nutrition-item">
            <div className="nutrition-item-header">
              <strong>{food.name}</strong>
              {food.alias && <span className="nutrition-alias">({food.alias})</span>}
              <span className="nutrition-category">{food.category}</span>
            </div>
            <div className="nutrition-values">
              <div className="nutrition-value">
                <span className="label">鈉</span>
                <span className="value">{food.sodium} mg</span>
              </div>
              <div className="nutrition-value">
                <span className="label">鉀</span>
                <span className="value">{food.potassium} mg</span>
              </div>
              <div className="nutrition-value">
                <span className="label">磷</span>
                <span className="value">{food.phosphorus} mg</span>
              </div>
              <div className="nutrition-value">
                <span className="label">鈣</span>
                <span className="value">{food.calcium} mg</span>
              </div>
              <div className="nutrition-value">
                <span className="label">鎂</span>
                <span className="value">{food.magnesium} mg</span>
              </div>
            </div>
            {food.warnings && food.warnings.length > 0 && (
              <div className="nutrition-warnings">
                {food.warnings.map((warning, wIdx) => (
                  <div key={wIdx} className={`warning ${warning.level}`}>
                    {warning.icon} {warning.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="nutrition-note">
          💡 數值為每 100g 可食部分 (源自食品營養成分資料庫)
        </div>
      </div>
    </div>
  );
}

export default NutritionResult;
