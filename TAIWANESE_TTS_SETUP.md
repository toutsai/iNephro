# 台語語音設定指南

## 📌 台語 TTS 現況說明

目前**純台語（閩南語）**的語音合成服務選項有限，以下是可用方案：

---

## 方案 1: HuggingFace 開源模型（推薦）

### 優點
- ✅ 免費使用
- ✅ 開源模型
- ✅ 社群支援

### 設定步驟

#### 1. 註冊 HuggingFace
前往 https://huggingface.co/join 註冊帳號

#### 2. 取得 API Token
1. 登入後前往：https://huggingface.co/settings/tokens
2. 點擊「New token」
3. 權限選擇「Read」即可
4. 複製產生的 Token

#### 3. 在 Vercel 設定環境變數
1. 前往 Vercel Dashboard → 您的專案 → Settings → Environment Variables
2. 新增環境變數：
   ```
   名稱: HUGGINGFACE_API_TOKEN
   值: [貼上您的 Token]
   環境: Production, Preview, Development (全選)
   ```
3. 儲存

#### 4. 尋找台語 TTS 模型
在 HuggingFace 搜尋可用的台語模型：
- 搜尋關鍵字：`taiwanese tts`, `minnan tts`, `hokkien tts`
- 範例模型（需確認是否存在）：
  - `formospeech/taiwanese-tts`
  - `taigi/text-to-speech`

#### 5. 更新 API 程式碼
編輯 `api/tts-taiwanese.js`，將 `MODEL_ID` 改為實際的模型 ID：
```javascript
const MODEL_ID = 'actual-model-id'; // 替換成找到的模型
```

---

## 方案 2: Google Cloud TTS（台灣國語）

### 說明
- ⚠️ 不是純台語，但有**台灣口音**的國語
- ✅ 語音品質佳
- ✅ API 穩定

### 設定步驟

#### 1. 啟用 Google Cloud TTS API
1. 前往 https://console.cloud.google.com/
2. 建立新專案或選擇現有專案
3. 啟用「Cloud Text-to-Speech API」
4. 前往「憑證」→「建立憑證」→「API 金鑰」
5. 複製 API 金鑰

#### 2. 在 Vercel 設定環境變數
```
名稱: GOOGLE_CLOUD_API_KEY
值: [貼上您的 API Key]
環境: Production, Preview, Development (全選)
```

#### 3. 使用方式
前端切換到「台灣國語」語音模式，使用 `/api/tts-google` 端點

**可用語音：**
- `cmn-TW-Wavenet-A` - 台灣女聲（標準）
- `cmn-TW-Wavenet-B` - 台灣女聲（柔和）
- `cmn-TW-Wavenet-C` - 台灣男聲（專業）✨ **推薦醫療場景**
- `cmn-TW-Wavenet-D` - 台灣男聲（溫和）

---

## 方案 3: 工研院 iTRITTS（企業方案）

### 說明
- ✅ 純台語語音
- ✅ 品質最佳
- ⚠️ 需要申請授權
- 💰 可能需要付費

### 申請步驟
1. 聯絡工研院資通所
2. 網址：https://www.itri.org.tw
3. 說明用途與需求
4. 簽訂授權合約
5. 取得 API 存取權限

---

## 方案 4: 自建台語 TTS（進階）

### 使用開源專案

#### Coqui TTS + 台語訓練模型
```bash
# 安裝 Coqui TTS
pip install TTS

# 使用預訓練模型（需先訓練台語模型）
tts --text "台語測試文字" --model_path path/to/taiwanese/model
```

#### Mozilla TTS
可以使用開源的台語語音資料集訓練自己的模型

---

## 🎯 建議方案

### 短期方案（立即可用）
**使用 Google Cloud TTS（台灣國語）**
- 語音品質好
- API 穩定可靠
- 設定簡單
- 雖非純台語，但有台灣口音

### 長期方案（需要開發）
**整合 HuggingFace 或自建模型**
- 尋找或訓練純台語 TTS 模型
- 可控制性高
- 符合在地化需求

---

## 💡 實際測試

### 測試 Google Cloud TTS
```bash
# 使用 curl 測試
curl -X POST http://localhost:3000/api/tts-google \
  -H "Content-Type: application/json" \
  -d '{"text": "你好，我是腎臟科醫師", "voice": "tw-male-1"}' \
  --output test.mp3
```

### 測試 HuggingFace TTS
```bash
# 先查詢可用資訊
curl http://localhost:3000/api/tts-taiwanese

# 測試語音生成
curl -X POST http://localhost:3000/api/tts-taiwanese \
  -H "Content-Type: application/json" \
  -d '{"text": "台語測試"}' \
  --output test.wav
```

---

## ❓ 常見問題

**Q: 為什麼找不到純台語 TTS？**
A: 台語 TTS 資源相對稀少，主要原因：
- 訓練資料不足
- 商業需求較小
- 技術投入有限

**Q: Google 台灣國語和純台語有什麼差別？**
A: 台灣國語是帶台灣口音的國語，純台語是完全不同的語言（閩南語系）

**Q: 可以自己訓練台語 TTS 模型嗎？**
A: 可以，但需要：
- 大量台語語音資料
- TTS 訓練技術知識
- 運算資源（GPU）

**Q: 有免費的純台語 TTS 嗎？**
A: 目前選項很少，建議：
1. 持續關注 HuggingFace 社群
2. 尋找台灣研究機構的開源專案
3. 使用台灣國語作為過渡方案

---

## 📚 相關資源

- **台語語音資料集**
  - https://github.com/Taiwanese-Corpus
  - SuíSiann 台語語料庫

- **開源 TTS 專案**
  - Coqui TTS: https://github.com/coqui-ai/TTS
  - Mozilla TTS: https://github.com/mozilla/TTS

- **台語文字處理**
  - 台灣閩南語羅馬字拼音方案（台羅）
  - 白話字（POJ）

---

## 🔄 更新記錄

- 2025-01-XX: 初版建立
- 待補充實際可用的 HuggingFace 台語模型 ID

---

**需要協助？**
如有問題請在 GitHub Issues 提出：https://github.com/toutsai/iNephro/issues
