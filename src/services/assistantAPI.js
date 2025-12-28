// src/services/assistantAPI.js
// Assistants API 服務層 - 封裝知識庫檢索邏輯

import OpenAI from 'openai';

/**
 * iNephro Assistants API 服務
 * 使用 OpenAI Assistants API 實現基於知識庫的問答
 */
class AssistantService {
  constructor(apiKey, assistantId) {
    this.client = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // 僅開發用，生產環境應使用後端
    });
    this.assistantId = assistantId;
    this.threadId = null; // 對話 Thread ID
  }

  /**
   * 初始化對話 Thread
   */
  async initializeThread() {
    try {
      const thread = await this.client.beta.threads.create();
      this.threadId = thread.id;
      console.log('Thread 已建立:', this.threadId);
      return thread.id;
    } catch (error) {
      console.error('建立 Thread 失敗:', error);
      throw error;
    }
  }

  /**
   * 發送訊息並取得回覆
   * @param {string} userMessage - 使用者訊息
   * @returns {Promise<{reply: string, confidence: string, sources: array}>}
   */
  async sendMessage(userMessage) {
    try {
      // 如果還沒有 Thread，先建立
      if (!this.threadId) {
        console.log('🔧 Thread 不存在，開始建立...');
        await this.initializeThread();
      }

      // 確認 threadId 已設置
      if (!this.threadId) {
        throw new Error('Thread ID 未正確初始化');
      }

      // 保存 threadId 到局部變數（避免 this 上下文問題）
      const currentThreadId = this.threadId;
      console.log('✅ 使用 Thread ID:', currentThreadId);

      // 1. 將使用者訊息加入 Thread
      await this.client.beta.threads.messages.create(currentThreadId, {
        role: 'user',
        content: userMessage
      });
      console.log('📝 訊息已加入 Thread');

      // 2. 執行 Assistant（啟動檢索與回答）
      const run = await this.client.beta.threads.runs.create(currentThreadId, {
        assistant_id: this.assistantId
      });

      console.log('🏃 Run 已建立:', run.id);
      console.log('🔍 即將呼叫 waitForRunCompletion，參數：', {
        threadId: currentThreadId,
        runId: run.id,
        threadIdType: typeof currentThreadId,
        runIdType: typeof run.id
      });

      // 3. 等待執行完成（明確傳入局部變數）
      const completedRun = await this.waitForRunCompletion(currentThreadId, run.id);

      // 4. 檢查執行狀態
      if (completedRun.status === 'failed') {
        throw new Error(`Assistant 執行失敗: ${completedRun.last_error?.message || '未知錯誤'}`);
      }

      // 5. 取得 Assistant 的回覆
      const messages = await this.client.beta.threads.messages.list(currentThreadId);
      const assistantMessage = messages.data.find(
        msg => msg.role === 'assistant' && msg.run_id === run.id
      );

      if (!assistantMessage) {
        throw new Error('無法取得 Assistant 回覆');
      }

      // 6. 解析回覆內容
      const reply = assistantMessage.content[0].text.value;

      // 7. 分析信心度（根據是否有引用來源）
      const annotations = assistantMessage.content[0].text.annotations || [];
      const confidence = this.analyzeConfidence(reply, annotations);

      // 8. 提取來源
      const sources = this.extractSources(annotations);

      return {
        reply,
        confidence,
        sources
      };

    } catch (error) {
      console.error('❌ 發送訊息錯誤:', error);
      throw error;
    }
  }

  /**
   * 等待 Run 執行完成
   * @param {string} threadId - Thread ID（明確傳入避免 this 丟失）
   * @param {string} runId - Run ID
   */
  async waitForRunCompletion(threadId, runId, maxAttempts = 30) {
    // 驗證參數
    if (!threadId || typeof threadId !== 'string') {
      console.error('❌ threadId 無效:', threadId, typeof threadId);
      throw new Error(`threadId 必須是字串，收到: ${typeof threadId} - ${threadId}`);
    }
    if (!runId || typeof runId !== 'string') {
      console.error('❌ runId 無效:', runId, typeof runId);
      throw new Error(`runId 必須是字串，收到: ${typeof runId} - ${runId}`);
    }

    let attempts = 0;
    console.log(`⏳ 等待 Run 完成...`);
    console.log(`   Thread ID: ${threadId}`);
    console.log(`   Run ID: ${runId}`);

    while (attempts < maxAttempts) {
      try {
        // 正確的參數順序：threadId 在前，runId 在後
        // REST API 路徑：GET /threads/{thread_id}/runs/{run_id}
        const run = await this.client.beta.threads.runs.retrieve(
          threadId,  // 第一個參數
          runId      // 第二個參數
        );

        console.log(`   狀態: ${run.status} (${attempts + 1}/${maxAttempts})`);

        if (run.status === 'completed') {
          console.log('✅ Run 執行完成');
          return run;
        }

        if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
          const errorMsg = run.last_error?.message || run.status;
          throw new Error(`Run 狀態異常: ${errorMsg}`);
        }

        // 等待 1 秒後再檢查
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        console.error(`❌ 檢查 Run 狀態時發生錯誤 (嘗試 ${attempts + 1}):`, error);
        console.error(`   Thread ID: ${threadId} (${typeof threadId})`);
        console.error(`   Run ID: ${runId} (${typeof runId})`);
        throw error;
      }
    }

    throw new Error('Run 執行逾時（超過 30 秒）');
  }

  /**
   * 分析回答信心度
   * @returns {'high' | 'medium' | 'low'}
   */
  analyzeConfidence(reply, annotations) {
    // 有來源引用 = 高信心度
    if (annotations && annotations.length > 0) {
      return 'high';
    }

    // 包含「不確定」、「建議諮詢」等關鍵字 = 低信心度
    const lowConfidenceKeywords = [
      '不確定',
      '建議諮詢',
      '超出.*知識',
      '無法確定',
      '請洽詢醫師'
    ];

    for (const keyword of lowConfidenceKeywords) {
      if (new RegExp(keyword).test(reply)) {
        return 'low';
      }
    }

    return 'medium';
  }

  /**
   * 提取引用來源
   */
  extractSources(annotations) {
    if (!annotations || annotations.length === 0) {
      return [];
    }

    return annotations
      .filter(ann => ann.type === 'file_citation')
      .map(ann => ({
        fileId: ann.file_citation.file_id,
        quote: ann.file_citation.quote || ''
      }));
  }

  /**
   * 清除當前對話
   */
  async clearThread() {
    this.threadId = null;
    await this.initializeThread();
  }

  /**
   * 取得 Thread 中的所有訊息（用於檢視對話歷史）
   */
  async getThreadMessages() {
    if (!this.threadId) {
      return [];
    }

    const messages = await this.client.beta.threads.messages.list(this.threadId);
    return messages.data;
  }
}

export default AssistantService;
