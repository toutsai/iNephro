# 🎉 iNephro 已升級為知識庫模式！

你的專案現在支援兩種運作模式：

## 🔵 知識庫模式（Assistants API）- **推薦**

**特色**：
- ✅ AI 只根據你上傳的醫療文件回答
- ✅ 避免錯誤資訊（不會憑空瞎掰）
- ✅ 可追溯來源（引用文件段落）
- ✅ 無法確定時會明確告知

**適用場景**：醫療衛教、專業諮詢

## 🟢 一般模式（ChatGPT API）- 備用

**特色**：
- 使用通用 ChatGPT 知識回答
- 較不精準，但免設定

**適用場景**：測試、開發

---

## 🚀 快速開始

### 選項 A：使用知識庫模式（推薦）

**第 1 步：建立 Assistant**
1. 前往 https://platform.openai.com/assistants
2. 點擊 "Create" 建立 Assistant
3. 設定名稱：`iNephro 腎臟科衛教助理`
4. 選擇模型：`gpt-4o-mini`
5. 啟用工具：勾選 **File search**
6. 複製 Instructions：參考 `ASSISTANT_SETUP_GUIDE.md`
7. 上傳知識庫文件（PDF、Word 等）
8. 複製 Assistant ID（格式：`asst_xxxxx`）

**第 2 步：設定環境變數**

編輯 `.env.local`：
```bash
VITE_OPENAI_KEY=sk-你的API-Key
VITE_ASSISTANT_ID=asst_你的Assistant-ID
```

**第 3 步：啟動**
```bash
npm run dev
```

看到以下訊息表示成功：
```
✅ Assistants API 已啟用（知識庫模式）
```

### 選項 B：使用一般模式（快速測試）

編輯 `.env.local`：
```bash
VITE_OPENAI_KEY=sk-你的API-Key
VITE_ASSISTANT_ID=
```
（留空 Assistant ID 即可）

---

## 📚 詳細文件

| 文件 | 說明 |
|------|------|
| **ASSISTANT_SETUP_GUIDE.md** | 詳細的 Assistant 建立教學（必讀） |
| **ASSISTANTS_API_PLAN.md** | 技術架構與規劃 |
| **IMPROVEMENTS.md** | 之前的改進說明 |

---

## 💡 推薦工作流程

### For 醫師（您）

1. **建立知識庫**
   - 上傳 KDIGO 指引
   - 上傳台灣腎臟醫學會衛教文章
   - 上傳您自己的常見 Q&A

2. **測試回答品質**
   - 在 OpenAI Playground 測試
   - 確認 AI 只根據文件回答
   - 調整 Instructions 提示詞

3. **部署使用**
   - 推送到 Vercel
   - 在 Vercel 環境變數設定 `VITE_ASSISTANT_ID`

4. **持續優化**
   - 收集病人常問的問題
   - 補充相關文件到知識庫
   - 定期更新醫療指引

### For 病人

1. 點擊左側主題或直接提問
2. AI 根據專業知識庫回答
3. 如果 AI 不確定，會建議諮詢醫師
4. 遇到危險徵兆會立即建議就醫

---

## 🔍 如何判斷目前是哪種模式？

開啟瀏覽器 Console（F12），看到：

- ✅ `✅ Assistants API 已啟用（知識庫模式）` → 知識庫模式
- ℹ️ `ℹ️ 未設定 Assistant ID，使用一般 ChatGPT 模式` → 一般模式

每次對話時也會顯示：
- 📚 `使用 Assistants API（知識庫檢索模式）`
- 💬 `使用一般 ChatGPT API（通用模式）`

---

## ⚡ 常見問題

### Q: 我現在就想測試，但還沒建立 Assistant？

A: 沒問題！只要不設定 `VITE_ASSISTANT_ID`，系統會自動使用一般 ChatGPT 模式。等你建立好 Assistant 再填入即可。

### Q: 已經部署到 Vercel，要怎麼啟用知識庫模式？

A:
1. 在 OpenAI 建立 Assistant（參考 `ASSISTANT_SETUP_GUIDE.md`）
2. 前往 Vercel 專案設定
3. 新增環境變數：`VITE_ASSISTANT_ID` = `asst_xxxxx`
4. 重新部署

### Q: 知識庫模式比較貴嗎？

A: 稍貴一點點，但非常划算：
- 一般模式：$0.15 / 1M tokens
- 知識庫模式：$0.15 / 1M tokens + $0.10 / GB / day（檔案儲存）
- **實際**：每月 1000 次對話約 $0.50

### Q: 可以隨時切換模式嗎？

A: 可以！只要修改 `.env.local` 的 `VITE_ASSISTANT_ID`：
- 有填 = 知識庫模式
- 留空 = 一般模式

### Q: 如何更新知識庫內容？

A:
1. 前往 https://platform.openai.com/assistants
2. 選擇你的 Assistant
3. 上傳新文件或刪除舊文件
4. 儲存後立即生效（無需重新部署）

---

## 🎯 下一步建議

**立即行動**：
1. 📖 閱讀 `ASSISTANT_SETUP_GUIDE.md`
2. 🔧 建立你的第一個 Assistant
3. 📤 上傳幾份腎臟科衛教文件
4. 🧪 測試 AI 回答品質

**進階規劃**：
- 整合 Line Bot（讓長輩更方便使用）
- 建立後台管理介面（查看對話記錄）
- 設定自動通知機制（低信心度問題通知醫師）

---

## 🆘 需要協助？

如有問題，請檢查：
1. Console 的錯誤訊息
2. `.env.local` 設定是否正確
3. Assistant ID 格式是否正確（`asst_` 開頭）

---

**恭喜！你的 iNephro 現在是一個基於專業知識庫的智能衛教系統了！** 🎊
