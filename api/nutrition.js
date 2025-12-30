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

  // 高鉀警告
  if (food.potassium >= thresholds.potassium.high) {
    warnings.push({
      level: 'warning',
      type: 'potassium',
      message: '⚠️ 高鉀食物',
      detail: `鉀含量 ${food.potassium} mg，建議限量食用`,
      icon: '🔶'
    });
  }

  // 高磷警告
  if (food.phosphorus >= thresholds.phosphorus.high) {
    warnings.push({
      level: 'warning',
      type: 'phosphorus',
      message: '⚠️ 高磷食物',
      detail: `磷含量 ${food.phosphorus} mg，建議限量食用`,
      icon: '🔶'
    });
  }

  // 高鈉警告
  if (food.sodium >= thresholds.sodium.high) {
    warnings.push({
      level: 'warning',
      type: 'sodium',
      message: '⚠️ 高鈉食物',
      detail: `鈉含量 ${food.sodium} mg，建議限量食用`,
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

    // 搜尋食物（模糊搜尋）
    const results = nutritionData.foods
      .filter(food => food.name.includes(query) || food.category.includes(query))
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
