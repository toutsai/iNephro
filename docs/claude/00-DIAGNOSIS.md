# 00-DIAGNOSIS：本環境三大失效模式與修法

> 撰於 2026-07-06（Fable 5 制度建立 session）。這是後面所有規則檔的依據。
> 讀者：未來在此 repo 工作的任何 Claude session（多為 Sonnet 等級）。

## 失效模式 #1：主對話下場讀大檔、掃 repo（token 漏最大）

**證據**：`src/App.css` 1920 行、`src/App.jsx` 465 行、`src/Doctor3D.jsx` 567 行、
`package-lock.json` 215KB、根目錄 9 個 setup 類 .md。整檔 Read `App.css`
一次就把 ~2 萬 token 灌進主 context 並長駐到 session 結束；掃 repo 找一個
函式常連讀 5+ 個檔案。

**具體修法**（違反任一條即算做錯）：
1. 超過 400 行的檔案**禁止無參數整檔 Read**。先 `Grep` 定位行號，再
   `Read` 帶 `offset`/`limit` 只讀目標段落 ±30 行。
2. 「找出 X 在哪裡／怎麼運作」這類需要看 3 個以上檔案的問題，派
   `Explore` subagent，要求只回「結論 + 檔案:行號」，原文不進主對話。
3. 永遠不要 Read `package-lock.json`；查依賴版本用
   `Grep pattern:"\"套件名\"" path:package.json`。

## 失效模式 #2：拿舊地圖走新城市（最容易失焦）

**證據**：舊 CLAUDE.md 寫「App.jsx ~230 行」（實際 465）、「App.css ~1400 行」
（實際 1920）；「上次進度」停在 2026-03-30，但 master 已多出 PR #46–#50：
presenter mode、醫療安全 guardrails（P0）、`api/_shared/security.js`、
`api/tts-taiwanese.js`、WebGL Context Lost 修復、polling 超時修復。
弱模型信任 CLAUDE.md 的描述去改碼，會改錯位置或重做已完成的事。

**具體修法**：
1. CLAUDE.md 不再寫會腐化的行數與細節，只寫穩定事實 + 路由（見新版）。
2. 動任何檔案前，先 `git log --oneline -5 -- <該檔案>` 看它最近被誰為何改過。
3. 每個做了實質變更的 session 結束前，必須更新 CLAUDE.md 的「目前狀態」
   區段（格式見 `40-MAINTENANCE.md`）。這是硬規則；唯一例外是 session 被
   強制中斷來不及更新，此時下一個 session 開場發現進度落後，有責任先補記。

## 失效模式 #3：委派無合約、驗收靠自驗（最容易出錯）

**證據**：舊流程派 subagent 沒有驗收條件與回報格式，回來長篇散文，主模型
再花一輪 token 消化；改完自己看一眼 diff 就 commit（改動者自己驗自己，
測試沒跑或只跑 build）。另外舊 CLAUDE.md 寫「自動合併並 push master」，
與遠端 session 的「只准 push 指定分支」硬性規則直接衝突，弱模型會亂猜。

**具體修法**：
1. 所有委派必附三件套：目標與動機、驗收條件、回報格式（模板見
   `30-TEMPLATES.md`）。沒有驗收條件的派工視同未派。
2. commit 前必跑 `npx vite build && npx vitest run`，任一失敗不准 commit。
3. 改動者不自驗：實質變更完成後，派一個 fresh-context subagent 依驗收
   條件覆核（規則見 `10-DISPATCH.md`「驗證不自驗」）。
4. 分支規則按環境分流（已寫進新版 CLAUDE.md）：遠端/網頁 session 一律用
   harness 指定的 `claude/...` 分支 + 開 draft PR；只有本機 CLI session
   且 harness 未指定分支時，才適用使用者授權的「合併 master 直接部署」。

## 本 harness 的極限（誠實條款）

以上修法能補的是**執行品質**：漏讀、失焦、無驗證。補不了的是：
- **模糊題與品味判斷**（如「這個 UI 對年長者夠不夠友善」「這段衛教文案
  的語氣對不對」）：拆解和多 agent 投票只能降低離譜錯誤，不能產生品味。
  遇到時的動作順序：(1) 升級到可用的最高模型出 2–3 個方案；(2) 用
  `AskUserQuestion` 附方案讓使用者選；(3) 若不能問，選最保守方案並在
  回報中明說「此為品味判斷，信心低」。
- **醫療內容正確性**：任何模型都不得自行擴寫醫療建議。改衛教內容只准
  改呈現方式，不准改醫療語意；語意變更一律停下問使用者。
