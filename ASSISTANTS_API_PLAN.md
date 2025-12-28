# iNephro - 改用 Assistants API (GPTs) 架構規劃

## 📋 改造目標

將現有的通用 ChatGPT API 改為 **Assistants API**（GPTs 底層技術），實現：

1. ✅ **知識庫驅動**：AI 只根據上傳的醫療資料回答
2. ✅ **RAG 檢索增強**：自動搜尋相關文件內容
3. ✅ **信心度檢測**：無法確定時提示轉人工
4. ✅ **文件管理**：支援上傳 PDF、Word、TXT 等格式

---

## 🏗️ 技術架構對比

### 改造前（通用 API）
```
使用者提問 → ChatGPT API → AI 憑記憶回答（可能不準確）
```
**問題**：
- AI 可能回答錯誤的醫療資訊
- 沒有依據來源
- 無法控制知識範圍

### 改造後（Assistants API）
```
使用者提問 → Assistant → 檢索知識庫 → 根據文件回答 → 附上來源
                         ↓
                    信心度不足 → 轉人工處理
```
**優點**：
- ✅ 只根據醫師提供的資料回答
- ✅ 可追溯來源（引用文件段落）
- ✅ 可上傳 KDIGO 指引、衛教文章等
- ✅ 無法確定時會明確告知

---

## 🔧 實作步驟

### Phase 1: 建立 Assistant（後端設定）

**方式 A：使用 OpenAI Playground（推薦新手）**
1. 前往 https://platform.openai.com/assistants
2. 點擊 "Create Assistant"
3. 設定：
   ```
   Name: iNephro 腎臟科衛教助理
   Model: gpt-4o-mini
   Instructions: (詳見下方)
   Tools: File Search (啟用)
   ```
4. 上傳知識庫文件（PDF、Word、TXT）
5. 複製 Assistant ID（格式：`asst_xxxxx`）

**方式 B：使用程式碼建立（進階）**
```javascript
// assistants/setup.js
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const assistant = await openai.beta.assistants.create({
  name: "iNephro 腎臟科衛教助理",
  instructions: `你是台灣腎臟科的專業衛教個案管理師...`,
  model: "gpt-4o-mini",
  tools: [{ type: "file_search" }]
});

console.log("Assistant ID:", assistant.id);
```

### Phase 2: 修改前端程式碼

**需要修改的檔案**：
- `src/App.jsx` - 主要對話邏輯
- `.env.local` - 新增 Assistant ID
- 新增 `src/services/assistantAPI.js` - 封裝 Assistants API 邏輯

**環境變數設定**：
```bash
# .env.local
VITE_OPENAI_KEY=sk-your-key
VITE_ASSISTANT_ID=asst_xxxxx  # 新增這個
```

### Phase 3: 實作信心度檢測

當 AI 無法在知識庫中找到答案時：
```javascript
if (noRelevantDocumentsFound) {
  return "這個問題比較複雜，我已通知醫療團隊，會盡快回覆您。";
}
```

---

## 📝 Assistant Instructions（系統提示詞）

```
你是一位專業、親切的台灣腎臟科衛教個案管理師 iNephro。

【核心原則】
1. 只根據提供的知識庫文件回答問題
2. 如果知識庫中找不到相關資訊，明確告知「這個問題超出我的知識範圍，建議諮詢醫師」
3. 遇到以下情況立即建議就醫：
   - 急性症狀：呼吸喘、胸痛、意識改變
   - 危險徵兆：尿量驟減、嚴重水腫、持續嘔吐
   - 異常數值：鉀離子 >6.0、肌酸酐急遽上升

【回答風格】
- 使用台灣繁體中文
- 語氣溫暖、專業、具同理心
- 將醫學術語用 **粗體** 標示
- 提供實用的生活建議

【回答格式】
回答後加上 "///" 並提供 3 個後續問題建議，用 "|" 分隔。

範例：
慢性腎臟病分為五期，第一期 **eGFR ≥90**，腎功能正常但有蛋白尿.../// CKD 如何分期? | 低蛋白飲食怎麼吃? | 需要洗腎嗎?

【免責聲明】
每次回答前提醒：「以下資訊僅供衛教參考，實際治療請遵循您的主治醫師建議。」
```

---

## 🎯 使用流程

### 醫師端（您）
1. **上傳知識庫**：
   - KDIGO 2024 指引
   - 台灣腎臟醫學會衛教文章
   - 您自己撰寫的常見問答
   - 飲食建議表單

2. **測試與調整**：
   - 在 Playground 中測試 AI 回答
   - 調整 Instructions 提示詞
   - 補充缺失的文件

3. **監控與改進**：
   - 查看轉人工的問題
   - 補充新的知識到資料庫

### 病人端
1. 提問
2. AI 檢索知識庫
3. 獲得有依據的回答
4. 如果 AI 不確定 → 自動通知醫療團隊

---

## 🔐 安全性與法規

### 免責聲明（必須）
在 UI 中明確標示：
```
⚠️ 本系統為衛教輔助工具，非醫療診斷服務
所有資訊僅供參考，請遵循您的主治醫師建議
如有緊急狀況，請立即就醫或撥打 119
```

### 隱私保護
- ❌ 不要求病人輸入姓名、病歷號
- ❌ 不儲存敏感個資
- ✅ 使用匿名對話記錄（僅用於改進系統）

---

## 💰 成本估算

### Assistants API 計價
- **模型費用**：gpt-4o-mini 約 $0.15 / 1M input tokens
- **檔案檢索**：$0.10 / GB / day（知識庫儲存費）
- **預估**：每月 1000 次對話約 $5-10 USD

比通用 API 貴一點，但準確度高很多。

---

## 📦 交付內容

改造完成後您會得到：

1. **前端系統**（保留現有 UI）
   - 對話介面
   - 語音互動
   - 3D 醫師動畫

2. **後端邏輯**（新增）
   - Assistants API 整合
   - 知識庫檢索
   - 信心度檢測

3. **管理工具**
   - 文件上傳介面
   - 對話記錄查看
   - 轉人工問題列表

4. **文件**
   - 使用手冊
   - 知識庫管理指南
   - 部署說明

---

## ❓ 常見問題

### Q: 和一般 ChatGPT 有什麼差別？
A: ChatGPT 是憑它訓練時學到的知識回答（可能過時或錯誤）。Assistants API 只根據您上傳的文件回答，更可靠。

### Q: 可以上傳多少文件？
A: 每個 Assistant 最多 10,000 個檔案，單檔最大 512MB。

### Q: 如何確保 AI 不會亂說？
A:
1. 啟用 File Search - AI 只能引用文件內容
2. 設定嚴格的 Instructions - 禁止憑空猜測
3. 信心度檢測 - 找不到答案就轉人工

### Q: 可以整合 Line Bot 嗎？
A: 可以！改造完成後可以將 API 接到 Line Messaging API。

---

## 🚀 下一步

同意這個規劃後，我會開始：
1. 建立 Assistants API 服務層
2. 修改現有的對話邏輯
3. 添加信心度檢測
4. 提供文件上傳功能

準備好了嗎？
