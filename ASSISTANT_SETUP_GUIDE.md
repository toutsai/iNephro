# 📘 iNephro Assistants API 設定指南

> 本指南將教您如何建立專屬的腎臟科知識庫 AI Assistant

---

## 🎯 為什麼要使用 Assistants API？

| 特性 | 一般 ChatGPT | Assistants API（知識庫） |
|------|--------------|-------------------------|
| 回答依據 | AI 憑記憶回答 | 只根據您上傳的文件回答 |
| 準確性 | ❌ 可能出錯 | ✅ 基於專業資料 |
| 可追溯性 | ❌ 無來源 | ✅ 引用文件段落 |
| 醫療適用性 | ❌ 不推薦 | ✅ 推薦 |

---

## 📝 Step 1: 建立 OpenAI Assistant

### 方法 A：使用 OpenAI Playground（推薦新手）

1. **登入 OpenAI 平台**
   - 前往：https://platform.openai.com/assistants
   - 使用您的 OpenAI 帳號登入

2. **點擊 "Create" 建立新 Assistant**

3. **基本設定**
   ```
   Name: iNephro 腎臟科衛教助理
   Model: gpt-4o-mini
   ```

4. **設定 Instructions（系統提示詞）**
   複製以下內容貼上：

   ```
   你是一位專業、親切的台灣腎臟科衛教個案管理師 iNephro。

   【核心原則】
   1. ✅ 只根據提供的知識庫文件回答問題
   2. ❌ 如果知識庫中找不到相關資訊，明確告知「這個問題超出我的知識範圍，建議諮詢醫師」
   3. ⚠️ 遇到以下情況立即建議就醫：
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

5. **啟用 Tools（工具）**
   - ✅ 勾選 **File search**（檔案檢索）
   - 這是實現 RAG 的關鍵功能

6. **上傳知識庫文件**

   點擊 "Files" 區域，上傳您準備的醫療資料：

   **建議上傳的文件**：
   - ✅ KDIGO 2024 CKD 指引（PDF）
   - ✅ 台灣腎臟醫學會衛教文章
   - ✅ 常見問答集（Word 或 PDF）
   - ✅ 飲食建議表（Excel 轉 PDF）
   - ✅ 您自己撰寫的衛教手冊

   **支援格式**：
   - PDF, DOCX, TXT, Markdown
   - 單檔最大 512MB
   - 總共最多 10,000 個檔案

7. **儲存並複製 Assistant ID**
   - 點擊右上角 "Save"
   - 複製顯示的 Assistant ID（格式：`asst_xxxxxxxxxx`）
   - **這個 ID 很重要，請妥善保存！**

---

### 方法 B：使用程式碼建立（進階）

如果您熟悉程式設計，可以用以下腳本建立：

```javascript
// scripts/create-assistant.js
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function createAssistant() {
  const assistant = await openai.beta.assistants.create({
    name: "iNephro 腎臟科衛教助理",
    instructions: `你是一位專業、親切的台灣腎臟科衛教個案管理師...（省略，同上）`,
    model: "gpt-4o-mini",
    tools: [{ type: "file_search" }]
  });

  console.log("✅ Assistant 建立成功！");
  console.log("Assistant ID:", assistant.id);
  console.log("\n請將此 ID 填入 .env.local 的 VITE_ASSISTANT_ID");
}

createAssistant();
```

執行：
```bash
node scripts/create-assistant.js
```

---

## 🔧 Step 2: 設定環境變數

1. **編輯 `.env.local` 檔案**

   ```bash
   # 必填：OpenAI API Key
   VITE_OPENAI_KEY=sk-proj-xxxxxxxxxxxxx

   # 必填：您剛建立的 Assistant ID
   VITE_ASSISTANT_ID=asst_xxxxxxxxxxxxx
   ```

2. **確認格式正確**
   - API Key 必須以 `sk-` 開頭
   - Assistant ID 必須以 `asst_` 開頭

3. **重新啟動開發伺服器**

   ```bash
   npm run dev
   ```

4. **檢查 Console 輸出**

   如果看到：
   ```
   ✅ Assistants API 已啟用（知識庫模式）
   ```
   表示設定成功！

   如果看到：
   ```
   ℹ️ 未設定 Assistant ID，使用一般 ChatGPT 模式
   ```
   請檢查 `.env.local` 設定是否正確。

---

## 📤 Step 3: 上傳與管理知識庫

### 上傳文件到 Assistant

**在 Playground 中上傳**：
1. 前往 https://platform.openai.com/assistants
2. 選擇您的 Assistant
3. 點擊 "Files" 區域
4. 拖曳或選擇文件上傳
5. 點擊 "Save"

**使用 API 上傳**（進階）：
```javascript
// 上傳文件
const file = await openai.files.create({
  file: fs.createReadStream("KDIGO_2024_CKD.pdf"),
  purpose: "assistants"
});

// 附加到 Assistant
await openai.beta.assistants.update("asst_xxxxx", {
  file_ids: [file.id]
});
```

### 建議的知識庫結構

```
knowledge-base/
├── guidelines/
│   ├── KDIGO_2024_CKD.pdf
│   └── KDIGO_2024_AKI.pdf
├── education/
│   ├── CKD_五期分類.pdf
│   ├── 透析須知.pdf
│   └── 低蛋白飲食指南.pdf
├── faq/
│   ├── 常見問題集_症狀篇.docx
│   ├── 常見問題集_飲食篇.docx
│   └── 常見問題集_用藥篇.docx
└── diet/
    ├── 腎臟病飲食建議表.pdf
    └── 楊桃危害說明.pdf
```

---

## 🧪 Step 4: 測試 Assistant

### 測試案例

1. **基本問答**
   ```
   問：什麼是慢性腎臟病？

   期望：AI 根據您上傳的文件回答，並標示 ✓ 此回答基於專業知識庫
   ```

2. **超出知識範圍**
   ```
   問：我可以吃榴槤嗎？（假設您沒有上傳榴槤相關資料）

   期望：這個問題超出我的知識範圍，建議諮詢醫師
   ```

3. **危險徵兆**
   ```
   問：我突然喘不過氣怎麼辦？

   期望：立即建議就醫或撥打 119
   ```

### 在 Playground 中測試

1. 前往 https://platform.openai.com/playground
2. 右側選擇 "Assistants"
3. 選擇您的 Assistant
4. 在對話框中輸入測試問題
5. 觀察回答是否符合預期

---

## 🔍 信心度檢測機制

系統會自動判斷 AI 回答的可靠程度：

| 信心度 | 判斷依據 | 顯示 |
|--------|----------|------|
| **High** | 有引用知識庫來源 | ✓ *此回答基於專業知識庫* |
| **Medium** | 回答了但無明確來源 | （無特殊標示） |
| **Low** | 包含「不確定」、「建議諮詢」等關鍵字 | 💡 **提示**：這個問題比較複雜，建議您諮詢專業醫師... |

---

## 💰 費用說明

### Assistants API 計價（2024 年費率）

| 項目 | 費用 |
|------|------|
| gpt-4o-mini Input | $0.15 / 1M tokens |
| gpt-4o-mini Output | $0.60 / 1M tokens |
| 檔案檢索（File Search） | $0.10 / GB / day |

### 實際成本估算

**場景**：每月 1,000 次對話，知識庫 100MB

```
模型費用：
- 平均每次對話 500 tokens input + 200 tokens output
- 1000 次 = 0.5M input + 0.2M output
- 費用 = (0.5 * $0.15) + (0.2 * $0.60) = $0.195

檔案檢索費用：
- 0.1 GB * $0.10 * 30 天 = $0.30

總計：約 $0.50 / 月
```

**結論**：非常划算！比請真人客服便宜太多。

---

## ⚠️ 常見問題排解

### Q1: Console 顯示「未設定 Assistant ID」

**檢查清單**：
- [ ] `.env.local` 檔案存在於專案根目錄
- [ ] `VITE_ASSISTANT_ID` 有填寫
- [ ] Assistant ID 格式正確（`asst_` 開頭）
- [ ] 已重新啟動開發伺服器

### Q2: AI 沒有根據我的文件回答

**可能原因**：
1. 文件尚未上傳成功
   - 檢查：前往 Playground 確認檔案列表
2. File Search 工具未啟用
   - 檢查：Assistant 設定中 Tools 是否勾選 "File search"
3. Instructions 設定錯誤
   - 確保有「只根據提供的知識庫文件回答」這段指示

### Q3: 回答速度很慢

**正常**：Assistants API 比一般 API 慢 2-3 倍（需要檢索文件）

**優化建議**：
- 減少知識庫檔案數量（合併相關文件）
- 使用 PDF 而非 DOCX（解析較快）
- 考慮使用 gpt-4o（比 gpt-4o-mini 快）

### Q4: 如何更新知識庫？

**方法**：
1. 前往 https://platform.openai.com/assistants
2. 選擇您的 Assistant
3. 在 Files 區域上傳新文件或刪除舊文件
4. 點擊 "Save"
5. 無需重新部署前端，立即生效

---

## 📚 進階功能（未來擴展）

### 1. 後台管理介面

建立一個管理頁面讓醫師：
- 查看所有對話記錄
- 標記需要人工回覆的問題
- 即時更新知識庫

### 2. Line Bot 整合

```javascript
// 將 AssistantService 接到 Line Messaging API
app.post('/webhook', async (req, res) => {
  const event = req.body.events[0];
  const userMessage = event.message.text;

  const result = await assistantService.sendMessage(userMessage);

  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: result.reply
  });
});
```

### 3. 對話分析

記錄常見問題，優化知識庫：
```sql
SELECT question, COUNT(*) as frequency
FROM conversations
WHERE confidence = 'low'
GROUP BY question
ORDER BY frequency DESC
LIMIT 10;
```

---

## ✅ 設定完成檢查表

完成以下步驟，即可開始使用知識庫模式：

- [ ] 已在 OpenAI 建立 Assistant
- [ ] 已設定 Instructions（系統提示詞）
- [ ] 已啟用 File Search 工具
- [ ] 已上傳至少 1 份知識庫文件
- [ ] 已複製 Assistant ID
- [ ] 已在 `.env.local` 填入 `VITE_ASSISTANT_ID`
- [ ] 已重新啟動開發伺服器
- [ ] Console 顯示「✅ Assistants API 已啟用」
- [ ] 測試問答功能正常
- [ ] AI 會根據上傳的文件回答

---

## 🆘 需要協助？

如有問題，請提供以下資訊：

1. Console 輸出的錯誤訊息
2. `.env.local` 設定（隱藏敏感資訊）
3. 問題發生的步驟

---

**祝您使用順利！iNephro 團隊**
