// --- 1. 固定精選主題 (有圖) ---
export const TOPIC_DATA = {
  'aki': {
    title: '急性腎損傷 (AKI)',
    image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?q=80&w=1000&auto=format&fit=crop',
    prompt: '請簡單介紹急性腎損傷(AKI)的定義與常見原因。'
  },
  'ckd': {
    title: '慢性腎臟病 (CKD)',
    image: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?q=80&w=1000&auto=format&fit=crop',
    prompt: '請說明慢性腎臟病(CKD)的五個分期是什麼？'
  },
  'hemodialysis': {
    title: '血液透析',
    image: 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?q=80&w=1000&auto=format&fit=crop',
    prompt: '請詳細介紹血液透析（洗腎）的原理、流程、注意事項與照護重點。'
  },
  'peritoneal-dialysis': {
    title: '腹膜透析',
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1000&auto=format&fit=crop',
    prompt: '請說明腹膜透析的原理、優缺點、操作方式與居家照護注意事項。'
  }
};

// --- 2. 隨機關鍵字池 (無圖，自動生成) ---
export const KEYWORD_POOL = [
  // 症狀類
  "蛋白尿", "血尿", "下肢水腫", "夜尿", "泡沫尿", "腰痛", "貧血", "高血壓",
  // 疾病類
  "糖尿病腎病變", "高血壓腎病變", "多囊腎", "腎結石", "腎絲球腎炎", "痛風", "尿路感染", "腎盂腎炎",
  // 數值類
  "肌酸酐 (Creatinine)", "腎絲球過濾率 (eGFR)", "尿素氮 (BUN)", "糖化血色素", "尿酸", "高鉀血症", "高血磷",
  // 治療與藥物
  "血液透析 (洗腎)", "腹膜透析", "腎臟移植", "利尿劑", "止痛藥對腎臟影響", "顯影劑","新型降血糖藥物對腎臟的保護作用",
  // 生活與保健
  "腎臟保健運動", "戒菸與腎臟健康", "高血壓飲食控制", "糖尿病飲食管理", "體重控制與腎臟健康",
  // 飲食生活
  "低蛋白飲食", "限水", "楊桃中毒", "低鈉飲食", "低鉀飲食", "低磷飲食" , "運動與腎臟健康",
  // 其他
  "腎性貧血", "骨骼代謝異常", "透析相關感染", "腎臟超音波檢查", "腎活檢", "慢性腎臟病併發症"];

// 通用圖片 (給隨機主題用)
export const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1000&auto=format&fit=crop";
