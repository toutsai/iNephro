/**
 * CKD-EPI 2021 eGFR 計算 (無種族校正)
 * 參考: NEJM 2021; 385:1737-1749
 */
export function calculateEGFR(creatinine, age, sex) {
  if (!creatinine || creatinine <= 0 || !age || age <= 0) return null;

  const isFemale = sex === 'female';
  const kappa = isFemale ? 0.7 : 0.9;
  const alpha = isFemale ? -0.241 : -0.302;
  const multiplier = isFemale ? 1.012 : 1.0;

  const crKappa = creatinine / kappa;
  const minCrKappa = Math.min(crKappa, 1);
  const maxCrKappa = Math.max(crKappa, 1);

  const eGFR = 142 * Math.pow(minCrKappa, alpha) * Math.pow(maxCrKappa, -1.200) * Math.pow(0.9938, age) * multiplier;

  return Math.round(eGFR * 10) / 10;
}

/**
 * CKD 分期 (KDIGO 2012)
 */
export function getCKDStage(egfr) {
  if (egfr === null || egfr === undefined) return null;

  if (egfr >= 90) return { stage: 'G1', label: '第一期', color: '#4CAF50', description: '腎功能正常或偏高，需注意是否有蛋白尿等其他腎損傷指標' };
  if (egfr >= 60) return { stage: 'G2', label: '第二期', color: '#8BC34A', description: '腎功能輕度下降，建議定期追蹤腎功能' };
  if (egfr >= 45) return { stage: 'G3a', label: '第三期a', color: '#FFC107', description: '腎功能輕度至中度下降，需積極控制危險因子' };
  if (egfr >= 30) return { stage: 'G3b', label: '第三期b', color: '#FF9800', description: '腎功能中度至重度下降，需轉介腎臟科醫師追蹤' };
  if (egfr >= 15) return { stage: 'G4', label: '第四期', color: '#FF5722', description: '腎功能重度下降，需準備腎臟替代療法' };
  return { stage: 'G5', label: '第五期', color: '#F44336', description: '腎衰竭，可能需要透析或腎臟移植' };
}
