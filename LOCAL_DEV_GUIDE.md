# 本地開發指南

## 🚀 快速開始

### 方式 1：完整開發環境（推薦）

使用 Vercel Dev 模擬完整的 Vercel 環境，包含 Edge Functions：

```bash
npm run dev
```

**功能：**
- ✅ 前端 React 應用（熱更新）
- ✅ 後端 Edge Function (`/api/chat`)
- ✅ 雲端快取（Upstash Redis）
- ✅ 完全模擬生產環境

**預設網址：** `http://localhost:3000`

---

### 方式 2：純前端開發

如果只需要開發 UI，不需要測試 AI 功能：

```bash
npm run dev:vite
```

**功能：**
- ✅ 前端 React 應用（熱更新）
- ❌ 無法調用 AI（/api/chat 會 404）

**預設網址：** `http://localhost:5173`

---

## 🔧 環境變數設定

### 本地開發環境變數

複製 `.env.example` 為 `.env.local`：

```bash
cp .env.example .env.local
```

編輯 `.env.local`，填入（選填）：

```bash
# Upstash Redis - 雲端快取（選填）
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

### 後端 API Key（Vercel CLI 會使用）

**重要：** OpenAI API Key 不能放在 `.env.local`（前端會看到）！

有兩種方式設定：

#### 方式 A：透過 Vercel CLI 連接遠端環境變數（推薦）

第一次執行 `npm run dev` 時，Vercel CLI 會要求登入並連接專案：

1. 選擇 **Link to existing project**
2. 選擇您的 `iNephro` 專案
3. Vercel CLI 會自動下載遠端環境變數

這樣本地開發就能使用 Vercel Dashboard 設定的環境變數！

#### 方式 B：建立本地環境變數檔案（僅供測試）

建立 `.env` 檔案（**不要提交到 Git！**）：

```bash
# .env (僅本地測試用)
OPENAI_API_KEY=sk-your-key-here
ASSISTANT_ID=asst_your-id
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

⚠️ **警告：** `.env` 已加入 `.gitignore`，不會被 Git 追蹤。

---

## 🧪 測試功能

### 1. 測試 Edge Function

開啟瀏覽器 Console (F12)，問一個問題：

```
🌐 調用 Edge Function（雲端快取 + AI）
📚 使用 Assistants API
✅ API 調用成功 (3000-5000ms)
```

### 2. 測試雲端快取

問同樣的問題兩次，第二次應該會看到：

```
✅ 雲端快取命中！(100-200ms, 快取年齡: 5秒)
```

### 3. 檢查 Vercel Dev 日誌

在終端機中會看到：

```
Vercel CLI x.x.x
> Ready! Available at http://localhost:3000
```

如果有錯誤，日誌會顯示詳細資訊。

---

## 🐛 常見問題

### Q: `npm run dev` 無法啟動？

A: 確認已安裝 Vercel CLI：
```bash
npm install -g vercel
```

### Q: 顯示 "Please login to Vercel"？

A: 執行登入命令：
```bash
vercel login
```

### Q: Edge Function 回傳錯誤？

A: 檢查環境變數是否正確設定：
```bash
vercel env ls
```

### Q: 想只開發前端，不需要後端？

A: 使用純前端模式：
```bash
npm run dev:vite
```

### Q: 如何清除 Vercel 快取？

A: 刪除 `.vercel` 資料夾：
```bash
rm -rf .vercel
```

---

## 📝 開發流程建議

1. **第一次開發**：
   ```bash
   npm run dev      # 會要求登入和連接專案
   ```

2. **日常開發**：
   ```bash
   npm run dev      # 直接啟動
   ```

3. **純 UI 開發**（不需要 AI）：
   ```bash
   npm run dev:vite # 更快，但無後端
   ```

4. **部署前測試**：
   ```bash
   npm run build    # 建置生產版本
   npm run preview  # 預覽
   ```

---

## 🎯 完成！

現在您可以：
- ✅ 本地開發時完整測試 AI 功能
- ✅ 使用雲端快取加速
- ✅ 完全模擬生產環境
- ✅ 安全管理 API Key

如有問題，請查看 Vercel CLI 文件：https://vercel.com/docs/cli
