# Vercel KV 雲端快取設定指南

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

### 步驟 1：在 Vercel Dashboard 建立 KV 資料庫

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇您的專案 `iNephro`
3. 點擊 **Storage** 標籤
4. 點擊 **Create Database**
5. 選擇 **KV**
6. 輸入資料庫名稱：`inephro-cache`
7. 選擇區域：**Singapore** 或最接近您用戶的區域
8. 點擊 **Create**

### 步驟 2：連接 KV 到專案

Vercel 會自動將以下環境變數加入您的專案：
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`
- `KV_URL`

**這些會自動設定，不需要手動操作！**

### 步驟 3：設定 OpenAI 環境變數

在 Vercel Dashboard 的 **Settings → Environment Variables** 加入：

```
VITE_OPENAI_KEY = sk-your-key-here
VITE_ASSISTANT_ID = asst_your-assistant-id
```

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
1. 前往 Vercel Dashboard
2. 選擇 Storage → `inephro-cache`
3. 可以看到：
   - 快取數量
   - 儲存空間使用
   - 請求次數

### 手動清除快取
在 KV Dashboard 中可以：
- 查看所有快取鍵（格式：`qa:xxxxx`）
- 刪除特定快取
- 清空所有快取

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

Vercel KV 免費方案包含：
- **256MB** 儲存空間
- **30,000 次**指令/月
- **3,000 次**請求/天

對於您的規模**完全足夠**！

## 🚨 常見問題

### Q: 如果快取滿了怎麼辦？
A: 256MB 可以存儲約 **10,000 筆**問答（每筆約 25KB），不太可能滿。如果真的滿了，KV 會自動刪除最舊的快取。

### Q: 部署後看不到加速效果？
A:
1. 檢查 Console 是否有錯誤
2. 確認 Network 標籤中 `/api/chat` 有正確回傳
3. 檢查 Response Headers 是否有 `X-Cache: HIT` 或 `MISS`

### Q: 如何強制重新查詢（不用快取）？
A: 目前快取是自動的。如需強制更新，可以：
1. 清除瀏覽器 localStorage
2. 在 Vercel KV Dashboard 刪除該快取鍵

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
