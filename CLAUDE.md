# iNephro 腎臟科衛教網站

## 專案概述
- **用途**: 腎臟科病人衛教 AI 諮詢網站（台灣繁體中文）
- **技術棧**: React 19 + Vite 7 + Three.js（3D 醫師）+ OpenAI Assistants API
- **部署**: Vercel Edge Functions + Upstash Redis 快取
- **目標用戶**: 台灣腎臟病患者（多為年長者）→ 無障礙與大字體優先於視覺炫技
- **紅線**: 不得改動醫療語意。衛教內容只能改呈現方式；醫療內容的增刪改一律先問使用者。

## 規則路由（按需讀取，不要一次全讀）
| 情境 | 讀這個檔 |
|------|----------|
| 開始任何任務前（必讀，~1 頁） | `docs/claude/00-DIAGNOSIS.md` 三大失效模式 |
| 要派 subagent、選 model、驗證成果 | `docs/claude/10-DISPATCH.md` |
| 不確定該不該升級／算不算完成／該不該問使用者 | `docs/claude/20-JUDGMENT.md` |
| 撰寫派工 prompt（搜尋/實作/重構/研究/審查） | `docs/claude/30-TEMPLATES.md` |
| 要修改 docs/claude/ 或本檔 | `docs/claude/40-MAINTENANCE.md` |
| 新 session 開場想了解環境背景 | `docs/claude/50-LETTER.md` |
| 踩坑之後 | 把教訓寫進 `docs/claude/LESSONS.md`（格式見 40） |

## 任務分級（取代舊的「每需求派 2-3 agent 分析」）
先判級再動手。判級順序：先驗 L，再驗 S，都不是就是 M（不會有無級可判的情況）：
- **L 級**（任一成立）：跨架構、碰醫療內容/安全機制/資料流、或使用者明說
  「重構/大改」→ 派 2 個分析 agent（技術可行性、UX+無障礙），計畫寫成檔案放
  `docs/claude/plans/`（不要放根目錄），**等使用者確認後才實作**。
- **S 級**（全部成立）：≤2 個檔案、不碰 api/、不碰醫療內容、改法明顯 →
  直接做。不派分析 agent、不寫 plan 檔。例：改按鈕文字、調 CSS 間距、修 typo。
- **M 級**：其餘一切（例：3 個以上檔案的機械修改、碰 api/、需要先搞懂現有
  機制）→ 先派 1 個 Explore agent 摸清現況，在對話中列出改動計畫
  （檔案+改法，不必寫 plan 檔），然後實作。

## 驗證與交付（所有等級通用）
1. commit 前必跑：`npx vite build && npx vitest run`，任一失敗不准 commit。
2. M/L 級變更在**整個任務收尾、最後一次 push 前**派 fresh-context agent 依
   驗收條件覆核一次（見 10-DISPATCH「驗證不自驗」）；中途的單元 commit 只需
   第 1 條的機器驗。
3. 隨做隨 commit：每完成一個獨立單元就 commit+push，不要攢到最後。

## 分支與部署（本節與其他任何檔案——含 docs/claude/*——衝突時，以本節為準；harness 的 session 級指令又優先於本節）
- **遠端/網頁 session**（harness 有指定 `claude/...` 分支）：只 push 該分支，
  開 draft PR。**不得 push master**。
- **本機 CLI session**（harness 未指定分支）：使用者已授權合併到 master 並
  `git push origin master` 觸發 Vercel 部署，不需每次詢問。

## Session 結束前（必做）
1. 更新下方「目前狀態」（格式與精簡規則見 `docs/claude/40-MAINTENANCE.md`）。
2. 踩過的坑寫入 `docs/claude/LESSONS.md`。
3. 確認所有變更已 commit + push。

## 重要檔案（行數會變，勿信舊數字；>400 行的檔案用 Grep 定位後分段 Read）
| 檔案 | 用途 |
|------|------|
| `src/App.jsx` | 主元件組合器 |
| `src/App.css` | 全部樣式（**大檔**，CSS Variables 主題系統）|
| `src/Doctor3D.jsx` | 3D 醫師（目光跟隨 + morph targets，**大檔**）|
| `src/components/` | ChatArea, Sidebar, EGFRCalculator, NutritionModal, NutritionResult, ErrorBoundary |
| `src/hooks/` | useChat（對話+快取）, useSpeech（TTS+語音輸入）, useNutrition |
| `src/utils/` | parseMessage, nutritionHelpers, egfrCalculator |
| `src/test/` | Vitest 測試（apiSecurity, egfrCalculator, nutrition, parseMessage, useChat）|
| `api/chat.js` | AI 端點（Assistants API + ChatGPT 降級 + Redis 快取 + 速率限制，**大檔**）|
| `api/_shared/security.js` | API 共用安全 helpers（P0 醫療安全 guardrails）|
| `api/nutrition.js` | 營養查詢（2180 食物 + NKF 鉀分級）|
| `api/warmup.js` / `api/tts-google.js` / `api/tts-taiwanese.js` | 快取預熱 cron / Google TTS / 台語 TTS |
| `vercel.json` | 部署設定（CSP + 快取標頭 + cron）|
| `public/doctor.glb` | 3D 醫師模型（ReadyPlayerMe）|

根目錄除 `README.md` 與本檔外的其餘 .md（SETUP、GUIDE、PLAN、OPTIMIZATION、
IMPROVEMENTS 類）皆為歷史設定文件，只在處理對應主題（TTS/Redis/Assistants
設定）時才讀。

## 技術地雷（改相關程式前必讀）
- 3D 模型是 ReadyPlayerMe GLB，骨骼用 quaternion 旋轉，**不可用 euler 覆蓋手臂**（會破壞姿勢）。
- 只安全動畫：Head、Spine2、morph targets（mouthOpen、mouthSmile）。
- CSS 用 CSS Variables 管理亮/暗色主題；行動/平板斷點 1024px。
- Vercel Edge Function 不穩定支援 `for await` streaming。
- Chrome speechSynthesis 長文本可能不觸發 onend，需輪詢檢查。
- Assistants API run polling 曾因平台超時出錯，`api/chat.js` 有專門處理，改前先看 git log。

## 目前狀態
**最後更新**: 2026-07-06

### 近期已完成（詳細歷史見 git log 與 docs/claude/archive/）
- [x] P0 醫療安全 guardrails + `api/_shared/security.js`（PR #46 前後）
- [x] Presenter mode（特色主題展示，前景 modal 形式，PR #48–#50）
- [x] WebGL Context Lost 修復、chat polling 平台超時修復
- [x] 台語 TTS（`api/tts-taiwanese.js`）
- [x] Claude 工作制度建立：`docs/claude/`（本次 session）

### 已知問題 / 待辦
- [ ] 3D 模型表情有限（只有 mouthOpen + mouthSmile）— 考慮換新模型
- [ ] 前端即時串流顯示（Vercel Edge 不支援 for-await streaming）
- [ ] 用戶回饋機制（AI 回答讚/踩）
- [ ] URL 路由（可書籤/分享主題）
