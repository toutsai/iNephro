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

export const PRESENTER_TOPICS = {
  'aki': {
    label: '急性變化',
    title: '急性腎損傷 (AKI)',
    subtitle: '快速認識 AKI 的定義、常見原因與需要警覺的變化。',
    steps: [
      { title: '定義', text: '腎功能在短時間內下降，常以肌酸酐上升或尿量減少辨識。' },
      { title: '常見原因', text: '脫水、感染、藥物、顯影劑、阻塞與低血壓都可能誘發。' },
      { title: '觀察重點', text: '追蹤尿量、體重、水腫、血壓、肌酸酐與電解質變化。' },
      { title: '就醫警訊', text: '無尿、嚴重喘、水腫快速惡化、意識改變或胸痛應立即就醫。' },
    ],
  },
  'ckd': {
    label: '長期照護',
    title: '慢性腎臟病 (CKD)',
    subtitle: '用分期、風險因子和日常照護建立長期追蹤觀念。',
    steps: [
      { title: '分期概念', text: 'CKD 主要依 eGFR 與蛋白尿程度評估風險與追蹤頻率。' },
      { title: '控制目標', text: '血壓、血糖、蛋白尿、血脂與體重管理都會影響腎功能下降速度。' },
      { title: '生活照護', text: '規律追蹤、低鈉飲食、避免自行服用止痛藥與草藥很重要。' },
      { title: '何時轉介', text: 'eGFR 快速下降、蛋白尿明顯或併發症增加時需要腎臟科評估。' },
    ],
  },
  'hemodialysis': {
    label: '透析選擇',
    title: '血液透析',
    subtitle: '理解血液透析流程、血管通路與日常安全重點。',
    steps: [
      { title: '基本原理', text: '透過透析機與人工腎臟清除尿毒素、多餘水分與部分電解質。' },
      { title: '治療流程', text: '通常每週數次，每次數小時，實際安排依病情與醫囑調整。' },
      { title: '通路照護', text: '瘻管或人工血管需每日觀察震顫、紅腫、疼痛與出血。' },
      { title: '安全提醒', text: '發燒、通路感染、胸痛、嚴重喘或低血壓症狀需立即處理。' },
    ],
  },
  'peritoneal-dialysis': {
    label: '居家治療',
    title: '腹膜透析',
    subtitle: '認識居家腹膜透析的優點、操作重點與感染警訊。',
    steps: [
      { title: '基本原理', text: '利用腹膜作為交換膜，透析液在腹腔內帶走毒素與水分。' },
      { title: '居家彈性', text: '可在家中進行，時間安排較彈性，但需要穩定的無菌操作。' },
      { title: '感染預防', text: '換液前洗手、戴口罩、清潔環境與管路照護是核心。' },
      { title: '警訊', text: '腹痛、透析液混濁、發燒或出口紅腫疼痛需儘快聯絡醫療團隊。' },
    ],
  },
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
