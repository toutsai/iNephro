#!/usr/bin/env node

/**
 * Excel → JSON 轉換腳本 (CommonJS 版本)
 *
 * 將衛福部食品營養成分資料庫 Excel 轉換為 JSON 格式
 *
 * 使用方式：
 *   node scripts/convert-excel-to-json.cjs <excel檔案路徑>
 *
 * 範例：
 *   node scripts/convert-excel-to-json.cjs public/nutrition.xlsx
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 判斷腎友警告
function determineKidneyWarning(food) {
  const potassium = parseFloat(food.potassium) || 0;
  const phosphorus = parseFloat(food.phosphorus) || 0;
  const sodium = parseFloat(food.sodium) || 0;

  // 楊桃特殊處理
  if (food.name && (food.name.includes('楊桃') || food.name.includes('杨桃'))) {
    return 'carambola';
  }

  // 同時高鉀高磷
  if (potassium >= 300 && phosphorus >= 250) {
    return 'both';
  }

  // 高鉀
  if (potassium >= 300) {
    return 'potassium';
  }

  // 高磷
  if (phosphorus >= 250) {
    return 'phosphorus';
  }

  // 高鈉
  if (sodium >= 100) {
    return 'sodium';
  }

  return null;
}

// 解析 Excel
function parseExcel(filePath) {
  log('\n📖 正在讀取 Excel 檔案...', 'cyan');

  if (!fs.existsSync(filePath)) {
    throw new Error(`找不到檔案: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  log(`✅ 找到工作表: ${sheetName}`, 'green');

  // 轉換為 JSON
  const rawData = XLSX.utils.sheet_to_json(worksheet);

  log(`📊 總共 ${rawData.length} 筆資料`, 'yellow');

  // 顯示前 3 筆的欄位名稱，幫助除錯
  if (rawData.length > 0) {
    log('\n🔍 檢測到的欄位名稱:', 'cyan');
    const firstRow = rawData[0];
    const columns = Object.keys(firstRow);
    columns.forEach((col, idx) => {
      if (idx < 15) {  // 只顯示前 15 個欄位
        log(`  ${idx + 1}. ${col} = ${firstRow[col]}`, 'yellow');
      }
    });
    if (columns.length > 15) {
      log(`  ... 還有 ${columns.length - 15} 個欄位`, 'yellow');
    }
  }

  return rawData;
}

// 轉換資料格式
function convertToNutritionFormat(rawData) {
  log('\n🔄 開始轉換資料格式...', 'cyan');

  const foods = [];
  let skipped = 0;

  rawData.forEach((row, index) => {
    try {
      // 根據 Excel 欄位名稱映射（衛福部資料庫格式）
      const food = {
        id: row['整合編碼'] || row['樣品編號'] || `FOOD${String(index + 1).padStart(6, '0')}`,
        name: row['樣品名稱'] || row['食品名稱'] || '',
        category: row['食品分類'] || row['俗名'] || '其他',
        calories: parseFloat(row['熱量(kcal)'] || row['熱量'] || 0),
        water: parseFloat(row['水分(g)'] || row['水分'] || 0),
        protein: parseFloat(row['粗蛋白(g)'] || row['蛋白質'] || 0),
        fat: parseFloat(row['粗脂肪(g)'] || row['脂肪'] || 0),
        carbs: parseFloat(row['碳水化合物(g)'] || row['總碳水化合物'] || 0),
        sodium: parseFloat(row['鈉(mg)'] || row['鈉'] || 0),
        potassium: parseFloat(row['鉀(mg)'] || row['鉀'] || 0),
        phosphorus: parseFloat(row['磷(mg)'] || row['磷'] || 0),
        calcium: parseFloat(row['鈣(mg)'] || row['鈣'] || 0),
        magnesium: parseFloat(row['鎂(mg)'] || row['鎂'] || 0)
      };

      // 跳過沒有名稱的資料
      if (!food.name || food.name.trim() === '') {
        skipped++;
        return;
      }

      // 判斷腎友警告
      food.kidneyWarning = determineKidneyWarning(food);

      foods.push(food);
    } catch (error) {
      log(`⚠️ 第 ${index + 1} 列轉換失敗: ${error.message}`, 'yellow');
      skipped++;
    }
  });

  log(`✅ 成功轉換 ${foods.length} 筆`, 'green');
  if (skipped > 0) {
    log(`⚠️ 跳過 ${skipped} 筆無效資料`, 'yellow');
  }

  return foods;
}

// 主程式
async function main() {
  try {
    log('\n========================================', 'blue');
    log('🥗 食品營養成分資料庫轉換工具', 'blue');
    log('========================================\n', 'blue');

    // 取得 Excel 檔案路徑
    const excelPath = process.argv[2] || path.join(__dirname, '../public/nutrition.xlsx');

    log(`📁 Excel 路徑: ${excelPath}`, 'cyan');

    // 解析 Excel
    const rawData = parseExcel(excelPath);

    // 轉換格式
    const foods = convertToNutritionFormat(rawData);

    // 建立輸出資料
    const output = {
      version: '2024',
      source: '衛生福利部食品藥物管理署 - 食品營養成分資料庫',
      note: '本資料庫數值單位為每100公克可食部分之營養素含量',
      generatedAt: new Date().toISOString(),
      totalFoods: foods.length,
      foods: foods,
      warningThresholds: {
        potassium: {
          high: 300,
          note: '鉀含量 > 300 mg/100g 視為高鉀食物，腎友需限量'
        },
        phosphorus: {
          high: 250,
          note: '磷含量 > 250 mg/100g 視為高磷食物，腎友需限量'
        },
        sodium: {
          high: 100,
          note: '鈉含量 > 100 mg/100g 視為高鈉食物，腎友需限量'
        },
        carambola: {
          note: '楊桃含神經毒素，腎友禁食'
        }
      }
    };

    // 輸出檔案路徑
    const outputPath = path.join(__dirname, '../public/nutrition-data.json');

    // 寫入檔案
    log('\n💾 正在寫入 JSON 檔案...', 'cyan');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

    log(`✅ 已儲存至: ${outputPath}`, 'green');

    // 統計資訊
    log('\n========================================', 'blue');
    log('📊 轉換統計', 'blue');
    log('========================================\n', 'blue');

    const warnings = {
      carambola: foods.filter(f => f.kidneyWarning === 'carambola').length,
      both: foods.filter(f => f.kidneyWarning === 'both').length,
      potassium: foods.filter(f => f.kidneyWarning === 'potassium').length,
      phosphorus: foods.filter(f => f.kidneyWarning === 'phosphorus').length,
      sodium: foods.filter(f => f.kidneyWarning === 'sodium').length,
      safe: foods.filter(f => !f.kidneyWarning).length
    };

    log(`總食物數量: ${foods.length}`, 'cyan');
    log(`🚫 楊桃（禁食）: ${warnings.carambola}`, 'red');
    log(`⚡ 高鉀高磷: ${warnings.both}`, 'yellow');
    log(`🔶 高鉀食物: ${warnings.potassium}`, 'yellow');
    log(`🔶 高磷食物: ${warnings.phosphorus}`, 'yellow');
    log(`🔶 高鈉食物: ${warnings.sodium}`, 'yellow');
    log(`✅ 安全食物: ${warnings.safe}`, 'green');

    // 檔案大小
    const stats = fs.statSync(outputPath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    log(`\n📦 檔案大小: ${fileSizeKB} KB`, 'cyan');

    log('\n✨ 轉換完成！\n', 'green');

  } catch (error) {
    log(`\n❌ 錯誤: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// 執行
main();
