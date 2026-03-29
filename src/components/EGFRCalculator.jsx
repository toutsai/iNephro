import React, { useState } from 'react';
import { calculateEGFR, getCKDStage } from '../utils/egfrCalculator';

export default function EGFRCalculator({ onClose }) {
  const [creatinine, setCreatinine] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('male');
  const [result, setResult] = useState(null);

  const handleCalculate = () => {
    const cr = parseFloat(creatinine);
    const a = parseInt(age, 10);
    if (isNaN(cr) || isNaN(a) || cr <= 0 || a <= 0) {
      setResult({ error: '請輸入有效的數值' });
      return;
    }
    const egfr = calculateEGFR(cr, a, sex);
    const stage = getCKDStage(egfr);
    setResult({ egfr, stage });
  };

  const handleReset = () => {
    setCreatinine('');
    setAge('');
    setSex('male');
    setResult(null);
  };

  return (
    <div style={{
      background: 'white', borderRadius: '16px', padding: '24px',
      maxWidth: '400px', width: '100%',
      boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '18px' }}>eGFR 計算器</h3>
        {onClose && (
          <button onClick={onClose} aria-label="關閉計算器" style={{
            background: 'none', border: 'none', fontSize: '20px',
            cursor: 'pointer', color: '#999', padding: '4px'
          }}>✕</button>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#999', marginTop: '-12px', marginBottom: '16px' }}>
        CKD-EPI 2021 公式（無種族校正）
      </p>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '14px', color: '#555', display: 'block', marginBottom: '4px' }}>
          血清肌酸酐 (mg/dL)
        </label>
        <input type="number" step="0.01" min="0.1" max="30" value={creatinine}
          onChange={(e) => setCreatinine(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
          placeholder="例：1.2"
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box', outline: 'none' }}
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '14px', color: '#555', display: 'block', marginBottom: '4px' }}>
          年齡 (歲)
        </label>
        <input type="number" min="18" max="120" value={age}
          onChange={(e) => setAge(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
          placeholder="例：65"
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box', outline: 'none' }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '14px', color: '#555', display: 'block', marginBottom: '6px' }}>生理性別</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          {[['male', '男性'], ['female', '女性']].map(([value, label]) => (
            <button key={value} onClick={() => setSex(value)} style={{
              flex: 1, padding: '10px', border: '1px solid',
              borderColor: sex === value ? '#3498db' : '#ddd',
              borderRadius: '8px', cursor: 'pointer',
              background: sex === value ? '#e3f2fd' : 'white',
              color: sex === value ? '#1976d2' : '#666',
              fontWeight: sex === value ? 'bold' : 'normal', fontSize: '15px',
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <button onClick={handleCalculate} style={{
          flex: 2, padding: '12px', background: '#3498db', color: 'white',
          border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
        }}>計算 eGFR</button>
        <button onClick={handleReset} style={{
          flex: 1, padding: '12px', background: '#f0f0f0', color: '#666',
          border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
        }}>重置</button>
      </div>

      {result && !result.error && (
        <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '16px', border: `2px solid ${result.stage.color}` }}>
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>估算腎絲球過濾率</div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: result.stage.color }}>{result.egfr}</div>
            <div style={{ fontSize: '13px', color: '#999' }}>mL/min/1.73m²</div>
          </div>
          <div style={{
            background: result.stage.color, color: 'white', padding: '8px 16px',
            borderRadius: '20px', textAlign: 'center', fontWeight: 'bold', fontSize: '15px', marginBottom: '8px',
          }}>CKD {result.stage.stage} - {result.stage.label}</div>
          <p style={{ fontSize: '13px', color: '#555', margin: '8px 0 0', lineHeight: '1.5' }}>{result.stage.description}</p>
          <p style={{ fontSize: '11px', color: '#aaa', margin: '12px 0 0', textAlign: 'center' }}>⚠️ 此結果僅供參考，請諮詢您的腎臟科醫師</p>
        </div>
      )}

      {result?.error && (
        <div style={{ background: '#fff3e0', padding: '12px', borderRadius: '8px', color: '#e65100', fontSize: '14px', textAlign: 'center' }}>
          {result.error}
        </div>
      )}
    </div>
  );
}
