/**
 * 快取預熱 API 端點
 *
 * 功能：自動預熱常見問題到快取
 * 可透過 Vercel Cron Jobs 定時執行
 */

import commonQuestionsData from '../scripts/common-questions.json' assert { type: 'json' };

// 延遲函數
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 調用 chat API 的函數
async function warmupQuestion(question, apiUrl) {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: question })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return { success: true, question, length: data.reply?.length || 0 };
  } catch (error) {
    return { success: false, question, error: error.message };
  }
}

export default async function handler(req, res) {
  // 安全驗證：檢查是否為 Vercel Cron 或本地測試
  const authHeader = req.headers.authorization;
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isLocalTest = process.env.NODE_ENV === 'development';

  if (!isVercelCron && !isLocalTest) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: '此端點僅供 Vercel Cron Jobs 使用'
    });
  }

  console.log('🚀 開始快取預熱...');

  const { commonQuestions } = commonQuestionsData;
  const results = { success: [], failed: [] };
  const startTime = Date.now();

  // 建構 API URL
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  const apiUrl = `${protocol}://${host}/api/chat`;

  console.log(`📋 總共 ${commonQuestions.length} 個問題`);
  console.log(`🌐 API 端點: ${apiUrl}`);

  // 逐一預熱問題
  for (let i = 0; i < commonQuestions.length; i++) {
    const question = commonQuestions[i];
    console.log(`[${i + 1}/${commonQuestions.length}] ${question}`);

    const result = await warmupQuestion(question, apiUrl);

    if (result.success) {
      results.success.push(result);
      console.log(`  ✓ 成功`);
    } else {
      results.failed.push(result);
      console.log(`  ✗ 失敗: ${result.error}`);
    }

    // 避免觸發速率限制（除了最後一個）
    if (i < commonQuestions.length - 1) {
      await delay(1500);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const successRate = (results.success.length / commonQuestions.length * 100).toFixed(1);

  const summary = {
    timestamp: new Date().toISOString(),
    duration: `${duration}s`,
    total: commonQuestions.length,
    success: results.success.length,
    failed: results.failed.length,
    successRate: `${successRate}%`,
    failedQuestions: results.failed.map(r => ({
      question: r.question,
      error: r.error
    }))
  };

  console.log('✨ 快取預熱完成');
  console.log(`✅ 成功: ${results.success.length}`);
  console.log(`❌ 失敗: ${results.failed.length}`);
  console.log(`⏱️  耗時: ${duration}s`);
  console.log(`📈 成功率: ${successRate}%`);

  return res.status(200).json(summary);
}
