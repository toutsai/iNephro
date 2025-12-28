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
        await this.initializeThread();
      }

      // 1. 將使用者訊息加入 Thread
      await this.client.beta.threads.messages.create(this.threadId, {
        role: 'user',
        content: userMessage
      });

      // 2. 執行 Assistant（啟動檢索與回答）
      const run = await this.client.beta.threads.runs.create(this.threadId, {
        assistant_id: this.assistantId
      });

      // 3. 等待執行完成
      const completedRun = await this.waitForRunCompletion(run.id);

      // 4. 檢查執行狀態
      if (completedRun.status === 'failed') {
        throw new Error('Assistant 執行失敗');
      }

      // 5. 取得 Assistant 的回覆
      const messages = await this.client.beta.threads.messages.list(this.threadId);
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
      console.error('發送訊息錯誤:', error);
      throw error;
    }
  }

  /**
   * 等待 Run 執行完成
   */
  async waitForRunCompletion(runId, maxAttempts = 30) {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const run = await this.client.beta.threads.runs.retrieve(
        this.threadId,
        runId
      );

      if (run.status === 'completed') {
        return run;
      }

      if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
        throw new Error(`Run 狀態異常: ${run.status}`);
      }

      // 等待 1 秒後再檢查
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error('Run 執行逾時');
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
