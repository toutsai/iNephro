# iNephro 腎臟科衛教網站

## 專案概述
- **用途**: 腎臟科病人衛教 AI 諮詢網站（台灣繁體中文）
- **技術棧**: React 19 + Vite 7 + Three.js（3D 醫師）+ OpenAI Assistants API
- **部署**: Vercel Edge Functions + Upstash Redis 快取
- **目標用戶**: 台灣腎臟病患者（多為年長者）

## 工作流規則（每次對話必須遵循）

### 1. 分析階段
收到任何功能需求或問題時，**先派 2-3 個 Agent 從不同角度分析**：
- Agent A: 技術可行性 + 架構影響
- Agent B: 使用者體驗 + 無障礙考量
- Agent C: 效能 + 安全性影響（視需要）
整合各 Agent 意見後形成結論。

### 2. 計畫階段
將分析結果寫成 **plan 檔案**，包含：
- 具體改動項目（哪些檔案、改什麼）
- 預期效果
- 風險評估
**等用戶確認後才開始實作。**

### 3. 執行階段
- 將不衝突的任務分配給**多個 Agent 平行執行**
- 每個 Agent 只改自己負責的檔案，避免衝突
- 完成後驗證：`npx vite build` + `npx vitest run`

### 4. 部署階段
- 提交到功能分支
- **自動合併到 master**（用戶已授權不需每次詢問）
- `git push origin master` 觸發 Vercel 自動部署

### 5. 對話結束時
- **更新本檔案的「上次進度」區段**
- 記錄完成了什麼、還有什麼待辦
- 確保所有變更已 commit + push

## 上次進度
**最後更新**: 2026-03-30

### 已完成
- [x] Sprint 1: 安全修復（CORS、速率限制、CSP、warmup bug、ErrorBoundary）
- [x] Sprint 2: 架構重構（App.jsx 拆分 12 模組 + Vitest 38 個測試）
- [x] Sprint 3-4: 對話持久化 + eGFR 計算器 + 字體控制 + 平板斷點
- [x] Sprint 5: 深色模式 + 靜態資源快取
- [x] UI 現代化：玻璃擬態、漸層、動畫升級
- [x] 色調重塑：馬卡龍藍白色系
- [x] 行動版底部導航列（3 tabs: 對話/營養/eGFR）
- [x] 行動版 3D 醫師佔半版面 + 底部字幕
- [x] 平板統一為行動版佈局（斷點 1024px）
- [x] 3D 醫師目光跟隨（滑鼠/觸控）
- [x] TTS 結束偵測修復（Chrome bug）
- [x] API: Assistants API polling 優化（快速間隔策略）

### 已知問題 / 待辦
- [ ] 3D 模型表情有限（只有 mouthOpen + mouthSmile）— 考慮換新模型
- [ ] 尋找更好的免費 3D 醫師模型（Meshy AI / Krikey / Sketchfab）
- [ ] 前端即時串流顯示（Vercel Edge 不支援 for-await streaming）
- [ ] 用戶回饋機制（AI 回答讚/踩）
- [ ] URL 路由（可書籤/分享主題）

## 重要檔案
| 檔案 | 用途 |
|------|------|
| `src/App.jsx` | 主元件（~230 行，薄層組合器）|
| `src/App.css` | 所有樣式（~1400 行，CSS 變數主題系統）|
| `src/Doctor3D.jsx` | 3D 醫師模型（目光跟隨 + morph targets）|
| `src/components/` | ChatArea, Sidebar, EGFRCalculator, NutritionModal, NutritionResult, ErrorBoundary |
| `src/hooks/` | useChat（對話+快取）, useSpeech（TTS+語音輸入）, useNutrition |
| `src/utils/` | parseMessage, nutritionHelpers, egfrCalculator |
| `src/constants/topics.js` | 主題常數 |
| `api/chat.js` | AI 端點（Assistants API + ChatGPT 降級 + Redis 快取 + 速率限制）|
| `api/nutrition.js` | 營養查詢（2180 食物 + NKF 鉀分級）|
| `api/warmup.js` | 快取預熱 cron |
| `api/tts-google.js` | Google Cloud TTS |
| `vercel.json` | 部署設定（CSP + 快取標頭 + cron）|
| `public/doctor.glb` | 3D 醫師模型（ReadyPlayerMe）|

## 技術備註
- 3D 模型是 ReadyPlayerMe GLB，骨骼用 quaternion 旋轉，**不可用 euler 覆蓋手臂**（會破壞姿勢）
- 只安全動畫：Head、Spine2、morph targets（mouthOpen、mouthSmile）
- CSS 用 CSS Variables 管理亮/暗色主題，行動版斷點 1024px
- Vercel Edge Function 不穩定支援 `for await` streaming
- Chrome speechSynthesis 長文本可能不觸發 onend，需要輪詢檢查
