# Upstash Redis 雲端快取設定指南

## 🎯 為什麼需要雲端快取？

### 效能提升（網路效應）
```
用戶 A (首次) 問「什麼是AKI」     → 3-5秒 → 存入雲端快取
用戶 B       問「什麼是AKI」     → 0.1秒 ⚡ (從快取讀取)
用戶 C       問「什麼是AKI」     → 0.1秒 ⚡
```

### 成本大幅降低
- **無雲端快取**：1000 個問題 = ~$30/月
- **有雲端快取**：1000 個問題 = ~$3-6/月（省 80-90%）

## 📝 設定步驟

### 步驟 1：註冊 Upstash 並建立 Redis 資料庫

1. 前往 [Upstash Console](https://console.upstash.com/)
2. 使用 **GitHub** 或 **Email** 註冊/登入
3. 點擊 **Create Database**
4. 填寫資訊：
   - **Name**: `inephro-cache`
   - **Type**: **Regional** (速度較快) 或 **Global** (容錯較好)
   - **Region**: 選擇 **ap-southeast-1** (Singapore，最接近台灣)
5. 點擊 **Create**

### 步驟 2：複製連線資訊

建立完成後，在 Database 頁面找到：

**REST API** 區塊（滾動到下方）：
- `UPSTASH_REDIS_REST_URL`: 類似 `https://xxx.upstash.io`
- `UPSTASH_REDIS_REST_TOKEN`: 一串長的 token

**請複製這兩個值！**

### 步驟 3：在 Vercel 設定環境變數

在 Vercel Dashboard 的 **Settings → Environment Variables** 加入：

```bash
# OpenAI 設定（如果還沒加）
VITE_OPENAI_KEY = sk-your-openai-key-here
VITE_ASSISTANT_ID = asst_your-assistant-id

# Upstash Redis 設定（從步驟 2 複製）
UPSTASH_REDIS_REST_URL = https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN = AaaaXXXX...your-token
```

**重要提醒：**
- 所有環境變數都選擇 **All Environments** (Production, Preview, Development)
- 點擊 **Save** 儲存

### 步驟 4：重新部署

```bash
git add .
git commit -m "新增雲端快取功能"
git push
```

Vercel 會自動觸發部署。

## 🧪 測試快取功能

部署完成後，開啟瀏覽器 Console (F12)，測試問同一個問題兩次：

### 第一次（建立快取）
```
🌐 調用 Edge Function（雲端快取 + AI）
✅ API 調用成功 (3542ms)
X-Cache: MISS
```

### 第二次（快取命中）
```
🌐 調用 Edge Function（雲端快取 + AI）
✅ 雲端快取命中！(124ms, 快取年齡: 5秒)
X-Cache: HIT
```

**速度提升：3542ms → 124ms（快 28 倍！）**

## 📊 快取策略

### 雙層快取架構
1. **第一層：localStorage**（0ms，限單一用戶）
2. **第二層：Vercel KV**（100-200ms，全用戶共享）
3. **第三層：OpenAI API**（3000-5000ms）

### 快取過期時間
- **7 天**（604800 秒）
- 適合醫療衛教內容（變動較少）
- 如有內容更新需求，可在 Vercel Dashboard 手動清除快取

## 🔍 監控與管理

### 查看快取使用狀況
1. 前往 [Upstash Console](https://console.upstash.com/)
2. 選擇您的資料庫 `inephro-cache`
3. 可以看到：
   - **Dashboard**: 請求數量、延遲、命中率
   - **Data Browser**: 查看所有快取鍵值
   - **Metrics**: 詳細的使用統計

### 手動清除快取

**方法 1：透過 Data Browser**
1. 在 Upstash Console 進入 **Data Browser**
2. 搜尋快取鍵（格式：`qa:xxxxx`）
3. 點擊 ❌ 刪除特定快取

**方法 2：使用 Redis CLI**
```bash
# 刪除單個快取
redis-cli -u <your-redis-url> DEL qa:xxxxx

# 清空所有快取
redis-cli -u <your-redis-url> FLUSHDB
```

### 查看快取內容
快取格式：
```json
{
  "reply": "急性腎損傷...",
  "confidence": "high",
  "sources": [...],
  "timestamp": 1703815234567,
  "question": "什麼是AKI"
}
```

## 💰 免費額度

Upstash Redis 免費方案包含：
- **10,000 次指令/天**（比 Vercel KV 的 3,000 次還多！）
- **256MB** 儲存空間
- **無限制的資料庫數量**

對於您的規模**綽綽有餘**！

## 🚨 常見問題

### Q: 如果快取滿了怎麼辦？
A: 256MB 可以存儲約 **10,000 筆**問答（每筆約 25KB），不太可能滿。如果真的滿了，KV 會自動刪除最舊的快取。

### Q: 部署後看不到加速效果？
A:
1. 檢查 Vercel 環境變數是否正確設定
2. 查看 Vercel 部署日誌，確認沒有錯誤
3. 開啟瀏覽器 Console (F12)，看是否有錯誤訊息
4. 確認 Network 標籤中 `/api/chat` 有正確回傳
5. 檢查 Response Headers 是否有 `X-Cache: HIT` 或 `MISS`

### Q: 如何確認 Upstash 連線成功？
A: 查看 Vercel 部署日誌：
- ✅ 成功：不會出現「Upstash 未設定」警告
- ❌ 失敗：會看到「⚠️ Upstash 未設定，快取功能將被停用」

### Q: 如何強制重新查詢（不用快取）？
A: 目前快取是自動的。如需強制更新，可以：
1. 清除瀏覽器 localStorage
2. 在 Upstash Console → Data Browser 刪除該快取鍵
3. 或使用 Redis CLI: `redis-cli -u <url> DEL qa:xxxxx`

## 📈 預期效果

使用一週後：
- 80% 的問題從雲端快取讀取（0.1-0.2秒回應）
- 20% 新問題需要調用 API（3-5秒）
- API 成本降低 80-90%
- 用戶體驗大幅提升

## 🎉 完成！

設定完成後，您的 iNephro 系統將具備：
- ⚡ 超快速回應（80% 問題 < 0.2秒）
- 💰 大幅降低成本（省 80-90%）
- 🌐 全用戶共享快取（網路效應）
- 🔄 自動降級機制（穩定可靠）
