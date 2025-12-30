#!/usr/bin/env node

/**
 * 快取預熱腳本 - Cache Warmup Script
 *
 * 功能：預先載入常見問題到 Upstash Redis 快取
 * 執行方式：node scripts/warmup-cache.js
 *
 * 需要環境變數：
 * - VITE_API_BASE_URL 或使用預設的 production URL
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 讀取常見問題列表
const questionsPath = path.join(__dirname, 'common-questions.json');
const { commonQuestions } = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));

// API 端點設定
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://i-nephro.vercel.app';
const API_ENDPOINT = `${API_BASE_URL}/api/chat`;

// 顏色輸出（可選）
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

// 延遲函數（避免請求過快）
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 調用 API 預熱單個問題
async function warmupQuestion(question, index, total) {
  try {
    log(`[${index + 1}/${total}] 預熱問題: ${question}`, 'cyan');

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: question })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.reply) {
      log(`  ✓ 成功 (${data.reply.length} 字元)`, 'green');
      return { success: true, question, responseLength: data.reply.length };
    } else {
      log(`  ✗ 回應格式錯誤`, 'red');
      return { success: false, question, error: '無回應內容' };
    }
  } catch (error) {
    log(`  ✗ 失敗: ${error.message}`, 'red');
    return { success: false, question, error: error.message };
  }
}

// 主要執行函數
async function main() {
  log('\n========================================', 'blue');
  log('🚀 iNephro 快取預熱開始', 'blue');
  log('========================================\n', 'blue');

  log(`📋 總共 ${commonQuestions.length} 個問題需要預熱`, 'yellow');
  log(`🌐 API 端點: ${API_ENDPOINT}`, 'yellow');
  log(`⏱️  預計需要 ${Math.ceil(commonQuestions.length * 5 / 60)} 分鐘\n`, 'yellow');

  const results = {
    success: [],
    failed: []
  };

  const startTime = Date.now();

  for (let i = 0; i < commonQuestions.length; i++) {
    const result = await warmupQuestion(commonQuestions[i], i, commonQuestions.length);

    if (result.success) {
      results.success.push(result);
    } else {
      results.failed.push(result);
    }

    // 每個請求之間延遲 2 秒，避免觸發速率限制
    if (i < commonQuestions.length - 1) {
      await delay(2000);
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);

  // 輸出統計結果
  log('\n========================================', 'blue');
  log('📊 預熱完成統計', 'blue');
  log('========================================\n', 'blue');

  log(`✅ 成功: ${results.success.length}`, 'green');
  log(`❌ 失敗: ${results.failed.length}`, results.failed.length > 0 ? 'red' : 'green');
  log(`⏱️  總耗時: ${duration} 秒`, 'cyan');
  log(`📈 成功率: ${(results.success.length / commonQuestions.length * 100).toFixed(1)}%`, 'cyan');

  if (results.failed.length > 0) {
    log('\n❌ 失敗的問題:', 'red');
    results.failed.forEach(({ question, error }) => {
      log(`  - ${question}`, 'yellow');
      log(`    錯誤: ${error}`, 'red');
    });
  }

  // 寫入執行記錄
  const logPath = path.join(__dirname, 'warmup-log.json');
  const logData = {
    timestamp: new Date().toISOString(),
    duration: `${duration}s`,
    total: commonQuestions.length,
    success: results.success.length,
    failed: results.failed.length,
    successRate: `${(results.success.length / commonQuestions.length * 100).toFixed(1)}%`,
    results: results
  };

  fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
  log(`\n📝 執行記錄已儲存至: ${logPath}`, 'cyan');

  log('\n✨ 快取預熱完成！\n', 'green');

  // 如果有失敗項目，返回錯誤碼
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// 執行
main().catch(error => {
  log(`\n💥 執行過程發生錯誤: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
