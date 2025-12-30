/**
 * 營養成分查詢 API
 *
 * 功能：查詢食物營養成分（鈉、鉀、磷、鈣、鎂等）
 * 資料來源：衛生福利部食品藥物管理署 - 食品營養成分資料庫
 */

// Edge Runtime 配置
export const config = {
  runtime: 'edge',
};

// 載入營養資料庫
import nutritionData from '../public/nutrition-data.json' assert { type: 'json' };

// 俗名對照表（常見別名 → 正式名稱關鍵字）
const COMMON_NAME_MAP = {
  // 水果類
  '芭樂': ['番石榴'],
  '柳丁': ['柳橙'],
  '橘子': ['柑橘', '橘'],
  '木瓜': ['番木瓜'],
  '奇異果': ['獼猴桃'],
  '葡萄柚': ['西柚'],
  '蘋果': ['蘋果'],
  '鳳梨': ['鳳梨', '菠蘿'],
  '西瓜': ['西瓜'],
  '榴槤': ['榴槤', '榴蓮'],
  '釋迦': ['番荔枝'],
  '蓮霧': ['蓮霧'],
  '柿子': ['柿'],
  '龍眼': ['龍眼', '桂圓'],
  '荔枝': ['荔枝'],
  '芒果': ['芒果', '檬果'],
  '櫻桃': ['櫻桃'],
  '草莓': ['草莓'],
  '藍莓': ['藍莓'],
  '火龍果': ['火龍果', '紅龍果'],
  '百香果': ['百香果'],
  '酪梨': ['酪梨', '鱷梨'],
  '哈密瓜': ['哈密瓜', '香瓜'],
  '水蜜桃': ['水蜜桃', '桃'],
  '李子': ['李'],
  '梅子': ['梅'],
  // 蔬菜類
  '高麗菜': ['甘藍', '包心菜', '捲心菜'],
  '空心菜': ['蕹菜'],
  '地瓜葉': ['甘藷葉', '番薯葉'],
  '番薯葉': ['甘藷葉', '地瓜葉'],
  '小白菜': ['小白菜', '青江菜'],
  '大白菜': ['大白菜', '包心白菜'],
  '青江菜': ['青江菜'],
  '菠菜': ['菠菜', '菠薐菜'],
  '芥菜': ['芥菜'],
  '茼蒿': ['茼蒿'],
  '韭菜': ['韭菜'],
  '蔥': ['蔥', '青蔥'],
  '薑': ['薑', '生薑'],
  '蒜頭': ['蒜', '大蒜'],
  '辣椒': ['辣椒'],
  '青椒': ['青椒', '甜椒'],
  '茄子': ['茄子', '茄'],
  '小黃瓜': ['胡瓜', '黃瓜'],
  '大黃瓜': ['胡瓜', '黃瓜'],
  '絲瓜': ['絲瓜'],
  '苦瓜': ['苦瓜'],
  '冬瓜': ['冬瓜'],
  '南瓜': ['南瓜'],
  '竹筍': ['竹筍', '筍'],
  '玉米筍': ['玉米筍'],
  '玉米': ['玉米'],
  '蘆筍': ['蘆筍'],
  '芹菜': ['芹菜'],
  '洋蔥': ['洋蔥'],
  '胡蘿蔔': ['胡蘿蔔', '紅蘿蔔'],
  '紅蘿蔔': ['胡蘿蔔', '紅蘿蔔'],
  '白蘿蔔': ['蘿蔔', '白蘿蔔'],
  '蕃茄': ['番茄', '蕃茄'],
  '番茄': ['番茄', '蕃茄'],
  '花椰菜': ['花椰菜', '花菜', '青花菜'],
  '綠花椰': ['青花菜', '花椰菜'],
  '香菇': ['香菇'],
  '金針菇': ['金針菇'],
  '杏鮑菇': ['杏鮑菇'],
  '秀珍菇': ['秀珍菇'],
  '木耳': ['木耳'],
  '豆芽菜': ['豆芽', '芽菜'],
  '馬鈴薯': ['馬鈴薯', '土豆'],
  '地瓜': ['甘藷', '番薯'],
  '番薯': ['甘藷', '番薯'],
  '芋頭': ['芋', '芋頭'],
  '山藥': ['山藥'],
  // 豆類
  '豆腐': ['豆腐'],
  '豆干': ['豆干', '豆乾'],
  '豆漿': ['豆漿', '豆奶'],
  '毛豆': ['毛豆', '鮮豆'],
  '黃豆': ['黃豆', '大豆'],
  '紅豆': ['紅豆'],
  '綠豆': ['綠豆'],
  '黑豆': ['黑豆'],
  '花生': ['花生', '落花生'],
  // 肉類
  '雞肉': ['雞', '雞肉'],
  '雞腿': ['雞腿'],
  '雞胸': ['雞胸'],
  '豬肉': ['豬', '豬肉'],
  '牛肉': ['牛', '牛肉'],
  '羊肉': ['羊', '羊肉'],
  '鴨肉': ['鴨', '鴨肉'],
  '鵝肉': ['鵝', '鵝肉'],
  // 海鮮類
  '蝦': ['蝦'],
  '蟹': ['蟹', '蟹肉'],
  '魚': ['魚'],
  '鮭魚': ['鮭魚', '三文魚'],
  '鯖魚': ['鯖魚'],
  '秋刀魚': ['秋刀魚'],
  '鱸魚': ['鱸魚'],
  '吳郭魚': ['吳郭魚', '台灣鯛'],
  '虱目魚': ['虱目魚'],
  '鱈魚': ['鱈魚'],
  '鮪魚': ['鮪魚'],
  '花枝': ['花枝', '墨魚'],
  '小卷': ['小卷', '鎖管'],
  '透抽': ['透抽', '中卷'],
  '章魚': ['章魚'],
  '蛤蜊': ['蛤蜊', '文蛤'],
  '蚵': ['蚵', '牡蠣', '蠔'],
  '蜆': ['蜆'],
  // 蛋奶類
  '雞蛋': ['雞蛋', '蛋'],
  '牛奶': ['牛奶', '鮮乳', '乳'],
  '優格': ['優格', '優酪乳', '酸奶'],
  '起司': ['起司', '乳酪', '芝士'],
  // 主食類
  '白飯': ['白飯', '米飯'],
  '麵條': ['麵', '麵條'],
  '吐司': ['吐司', '土司'],
  '麵包': ['麵包'],
  '饅頭': ['饅頭'],
  '包子': ['包子'],
  '水餃': ['水餃'],
  '粽子': ['粽'],
  '湯圓': ['湯圓'],
  // 其他
  '豆芽': ['豆芽', '芽菜'],
  '海帶': ['海帶', '昆布'],
  '紫菜': ['紫菜', '海苔'],
  '腰果': ['腰果'],
  '杏仁': ['杏仁'],
  '核桃': ['核桃', '胡桃'],
  '芝麻': ['芝麻']
};

/**
 * 根據 NKF (美國國家腎臟基金會) 標準判斷鉀含量等級
 * 100g 食品依含鉀量分為四個等級：
 * - 低鉀食品：鉀含量 <100 mg
 * - 中等鉀含量食品：鉀含量 100-200 mg
 * - 高鉀食品：鉀含量 200-300 mg
 * - 非常高鉀食品：鉀含量 >300 mg
 */
function getPotassiumLevel(potassium) {
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
 * 判斷食物是否有腎友警告
 */
function getKidneyWarnings(food) {
  const warnings = [];
  const thresholds = nutritionData.warningThresholds;

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

  // 高磷警告
  if (food.phosphorus >= thresholds.phosphorus.high) {
    warnings.push({
      level: 'warning',
      type: 'phosphorus',
      message: '⚠️ 高磷食物',
      detail: `磷含量 ${food.phosphorus.toFixed(1)} mg，建議限量食用`,
      icon: '🔶'
    });
  }

  // 高鈉警告
  if (food.sodium >= thresholds.sodium.high) {
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

/**
 * 主處理函式
 */
export default async function handler(request) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // 處理 OPTIONS 請求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 解析 URL 參數
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const limit = parseInt(url.searchParams.get('limit') || '10');

    if (!query) {
      return new Response(
        JSON.stringify({
          error: '請提供查詢關鍵字',
          example: '/api/nutrition?q=香蕉'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 擴展搜尋關鍵字（包含俗名對照）
    const searchTerms = [query];

    // 檢查是否有俗名對照
    if (COMMON_NAME_MAP[query]) {
      searchTerms.push(...COMMON_NAME_MAP[query]);
    }

    // 反向查找：如果輸入的是正式名稱，也找對應的俗名
    for (const [commonName, formalNames] of Object.entries(COMMON_NAME_MAP)) {
      if (formalNames.some(name => query.includes(name) || name.includes(query))) {
        searchTerms.push(commonName);
      }
    }

    // 搜尋食物（模糊搜尋，支援俗名）
    const results = nutritionData.foods
      .filter(food =>
        searchTerms.some(term =>
          food.name.includes(term) ||
          food.category.includes(term) ||
          term.includes(food.name)
        )
      )
      .slice(0, limit)
      .map(food => ({
        ...food,
        warnings: getKidneyWarnings(food)
      }));

    // 回傳結果
    return new Response(
      JSON.stringify({
        query,
        count: results.length,
        results,
        source: nutritionData.source,
        note: nutritionData.note
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400' // 快取 24 小時
        }
      }
    );

  } catch (error) {
    console.error('❌ Nutrition API 錯誤:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
