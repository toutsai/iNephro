# 🤖 設定自動快取預熱

## 📋 概述

專案已配置 Vercel Cron Jobs，可自動每 7 天執行一次快取預熱，確保常見問題始終保持快取狀態。

## ✅ 設定步驟

### 步驟 1：產生安全金鑰

在本地終端執行以下指令產生隨機密鑰：

```bash
openssl rand -base64 32
```

或使用 Node.js：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**範例輸出：**
```
Kx7vR2mP9nQ8wL3tJ5sH6fY4dC1aE0bZ2gT8vN4mW9xU7pL3qK5rM6jI1hG2fD4c
```

複製這個金鑰備用。

### 步驟 2：在 Vercel 設定環境變數

1. **登入 Vercel Dashboard**
   - 前往 https://vercel.com/dashboard
   - 選擇 `iNephro` 專案

2. **進入設定頁面**
   - 點擊上方的 **Settings**

3. **新增環境變數**
   - 左側選單點擊 **Environment Variables**
   - 點擊 **Add New**
   - 填入以下資訊：
     - **Name**: `CRON_SECRET`
     - **Value**: 貼上步驟 1 產生的金鑰
     - **Environments**: 勾選 **Production**, **Preview**, **Development**
   - 點擊 **Save**

4. **重新部署**
   - 回到 **Deployments** 頁面
   - 點擊最新部署旁的 **⋯** (三個點)
   - 選擇 **Redeploy**
   - 確認 **Redeploy**

### 步驟 3：驗證設定

部署完成後，前往 Vercel Dashboard 驗證：

1. **檢查 Cron Job 是否註冊**
   - Settings → Cron Jobs
   - 應該看到：
     ```
     /api/warmup
     Schedule: 0 0 */7 * *
     Next run: [日期時間]
     ```

2. **手動觸發測試**（可選）
   - 在 Cron Jobs 頁面點擊 **Trigger** 按鈕
   - 或使用 curl 指令：
   ```bash
   curl -X GET https://i-nephro.vercel.app/api/warmup \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

3. **查看執行結果**
   - Deployments → 最新部署 → **Functions**
   - 找到 `/api/warmup` 查看執行日誌
   - 應該看到類似：
   ```
   🚀 開始快取預熱...
   📋 總共 37 個問題
   [1/37] 什麼是慢性腎臟病 (CKD)？
     ✓ 成功
   ...
   ✨ 快取預熱完成
   ✅ 成功: 37
   ❌ 失敗: 0
   ⏱️  耗時: 89.2s
   📈 成功率: 100.0%
   ```

## 📅 執行排程

### 預設排程
- **頻率**: 每 7 天
- **時間**: UTC 00:00（台灣時間 08:00）
- **Cron 表達式**: `0 0 */7 * *`

### 修改頻率

編輯 `vercel.json` 中的 `schedule` 欄位：

```json
{
  "crons": [
    {
      "path": "/api/warmup",
      "schedule": "0 0 */7 * *"  // 修改這裡
    }
  ]
}
```

**常用排程範例：**

| 需求 | Cron 表達式 | 說明 |
|------|------------|------|
| 每天 | `0 0 * * *` | 每天午夜執行 |
| 每 3 天 | `0 0 */3 * *` | 每 3 天執行 |
| 每週日 | `0 0 * * 0` | 每週日執行 |
| 每月 1 號 | `0 0 1 * *` | 每月 1 號執行 |
| 每 14 天 | `0 0 */14 * *` | 每 14 天執行 |

修改後提交並推送，Vercel 會自動更新排程。

## 🔍 監控與維護

### 查看執行歷史

1. **Vercel Dashboard**
   - Deployments → Functions → `/api/warmup`
   - 可查看每次執行的詳細日誌

2. **成功指標**
   - 成功率應維持在 95% 以上
   - 執行時間約 60-120 秒
   - 37 個問題全部成功

### 常見問題排查

**Q1: Cron Job 沒有執行？**
- 檢查 `CRON_SECRET` 是否已設定
- 確認 `vercel.json` 已部署
- 查看 Settings → Cron Jobs 確認排程

**Q2: 執行失敗 401 Unauthorized？**
- `CRON_SECRET` 環境變數未設定或錯誤
- 重新設定並重新部署

**Q3: 部分問題失敗？**
- 可能是暫時性網路問題
- 查看失敗的具體問題和錯誤訊息
- 下次執行會重新預熱失敗的問題

**Q4: 執行時間過長？**
- 正常情況 60-120 秒
- 如果超過 5 分鐘，可能是 API 回應慢
- 可調整 `api/warmup.js` 中的 `delay(1500)` 減少延遲

## 🎯 預期效果

設定完成後，自動預熱將帶來：

- ✅ **100% 快取命中率**：常見問題永遠保持快取
- ⚡ **極速回應**：0-200ms（vs 原本 3-5 秒）
- 💰 **成本優化**：每月節省 $20-40 USD
- 🔄 **自動維護**：無需手動操作，完全自動化

## 📊 費用說明

**Vercel Cron Jobs 免費額度：**
- 免費方案：每月 100 次執行
- 每 7 天執行一次 = 每月約 4 次
- **完全免費，無額外費用**

**OpenAI API 費用：**
- 每次預熱調用 37 次 API
- 每月自動執行 4 次 = 148 次 API 調用
- 約 $2-3 USD/月
- 但這些快取會節省數百次日常調用，整體仍大幅降低成本

## 🔐 安全性

- `CRON_SECRET` 確保只有 Vercel Cron 可觸發
- API 端點會驗證 `Authorization` header
- 未授權的請求會返回 401 錯誤
- 建議定期更換 `CRON_SECRET`（每 3-6 個月）

## 📚 相關文件

- [快取預熱詳細說明](scripts/README.md)
- [成本優化指南](COST_OPTIMIZATION.md)
- [Vercel Cron Jobs 官方文件](https://vercel.com/docs/cron-jobs)
