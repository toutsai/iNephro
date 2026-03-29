/**
 * 判斷鉀含量等級 (NKF 四級分類)
 * - 低鉀食品：鉀含量 <100 mg
 * - 中等鉀含量食品：鉀含量 100-200 mg
 * - 高鉀食品：鉀含量 200-300 mg
 * - 非常高鉀食品：鉀含量 >300 mg
 */
export function getPotassiumLevel(potassium) {
  if (potassium < 100) {
    return { level: 'low', label: '低鉀食品', icon: '🟢', color: 'success' };
  } else if (potassium >= 100 && potassium <= 200) {
    return { level: 'medium', label: '中等鉀含量', icon: '🟡', color: 'info' };
  } else if (potassium > 200 && potassium <= 300) {
    return { level: 'high', label: '高鉀食品', icon: '🟠', color: 'warning' };
  } else {
    return { level: 'very-high', label: '非常高鉀食品', icon: '🔴', color: 'danger' };
  }
}

/**
 * 判斷食物是否有腎友警告（使用 NKF 標準）
 */
export function getKidneyWarnings(food) {
  const warnings = [];

  // 特殊警告：楊桃（含神經毒素）
  if (food.kidneyWarning === 'carambola') {
    warnings.push({
      level: 'danger',
      type: 'carambola',
      message: '⛔ 腎友禁食',
      detail: '楊桃含神經毒素，腎功能不全者食用可能導致打嗝、嘔吐、意識障礙等中毒症狀',
      icon: '🚫'
    });
    return warnings;
  }

  // 鉀含量等級 (NKF 四級分類)
  const potassiumLevel = getPotassiumLevel(food.potassium);

  if (potassiumLevel.level === 'very-high') {
    warnings.push({
      level: 'danger',
      type: 'potassium',
      message: `🔴 ${potassiumLevel.label}`,
      detail: `鉀含量 ${food.potassium.toFixed(1)} mg (>300mg)，腎友應避免食用`,
      icon: '🔴'
    });
  } else if (potassiumLevel.level === 'high') {
    warnings.push({
      level: 'warning',
      type: 'potassium',
      message: `🟠 ${potassiumLevel.label}`,
      detail: `鉀含量 ${food.potassium.toFixed(1)} mg (200-300mg)，腎友需限量食用`,
      icon: '🟠'
    });
  } else if (potassiumLevel.level === 'medium') {
    warnings.push({
      level: 'info',
      type: 'potassium',
      message: `🟡 ${potassiumLevel.label}`,
      detail: `鉀含量 ${food.potassium.toFixed(1)} mg (100-200mg)，適量食用`,
      icon: '🟡'
    });
  } else {
    warnings.push({
      level: 'success',
      type: 'potassium',
      message: `🟢 ${potassiumLevel.label}`,
      detail: `鉀含量 ${food.potassium.toFixed(1)} mg (<100mg)，腎友可安心食用`,
      icon: '🟢'
    });
  }

  // 高磷警告 (>250 mg)
  if (food.phosphorus >= 250) {
    warnings.push({
      level: 'warning',
      type: 'phosphorus',
      message: '⚠️ 高磷食物',
      detail: `磷含量 ${food.phosphorus.toFixed(1)} mg，建議限量食用`,
      icon: '🔶'
    });
  }

  // 高鈉警告 (>100 mg)
  if (food.sodium >= 100) {
    warnings.push({
      level: 'warning',
      type: 'sodium',
      message: '⚠️ 高鈉食物',
      detail: `鈉含量 ${food.sodium.toFixed(1)} mg，建議限量食用`,
      icon: '🔶'
    });
  }

  // 同時高鉀高磷（如：堅果類、豆類）
  if (food.kidneyWarning === 'both') {
    warnings.push({
      level: 'caution',
      type: 'both',
      message: '💡 高鉀高磷食物',
      detail: '同時含高鉀、高磷，腎友應避免或嚴格限量',
      icon: '⚡'
    });
  }

  return warnings;
}
