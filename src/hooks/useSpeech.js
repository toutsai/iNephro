import { useState, useEffect, useRef } from 'react';

export function useSpeech() {
  const [isDoctorSpeaking, setIsDoctorSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [ttsMode, setTtsMode] = useState('browser');
  const [googleVoice, setGoogleVoice] = useState('tw-male-1');
  const audioRef = useRef(null);

  useEffect(() => {
    const loadVoices = () => {
      const all = window.speechSynthesis.getVoices();
      console.log('🔍 偵測到的語音列表:', all.map(v => `${v.name} (${v.lang})`));

      const chinese = all.filter(v =>
        v.lang.includes('zh') ||
        v.lang.includes('CN') ||
        v.lang.includes('TW') ||
        v.lang.includes('nan')
      );

      // 常見女聲名字黑名單
      const femaleNames = ['ting-ting', 'sin-ji', 'mei-jia', 'ya-ling', 'female', '女'];

      // 1. 優先：志偉語音
      const zhiwei = chinese.find(v =>
        v.name.toLowerCase().includes('zhiwei') ||
        v.name.includes('志偉')
      );

      // 2. 次選：明確標註男聲
      const maleChinese = chinese.find(v => {
        const lowerName = v.name.toLowerCase();
        return (
          lowerName.includes('male') ||
          v.name.includes('男') ||
          lowerName.includes('yunyang') ||
          lowerName.includes('云揚')
        );
      });

      // 3. 備選：排除女聲後的第一個中文語音
      const notFemale = chinese.find(v => {
        const lowerName = v.name.toLowerCase();
        return !femaleNames.some(fn => lowerName.includes(fn));
      });

      if (zhiwei) {
        console.log('✅ 使用志偉語音:', zhiwei.name);
        setSelectedVoice(zhiwei);
      } else if (maleChinese) {
        console.log('✅ 使用中文男聲:', maleChinese.name);
        setSelectedVoice(maleChinese);
      } else if (notFemale) {
        console.log('⚠️ 使用非女聲的中文語音:', notFemale.name);
        setSelectedVoice(notFemale);
      } else if (chinese.length > 0) {
        console.log('⚠️ 使用任意中文語音（可能為女聲）:', chinese[0].name);
        setSelectedVoice(chinese[0]);
      }
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  const speak = (rawText) => {
    window.speechSynthesis.cancel();

    // 過濾掉按鈕指令
    let textToSpeak = rawText.split('///')[0];

    // 過濾符號和特殊標記
    textToSpeak = textToSpeak
      .replace(/✓\s*\*此回答基於專業知識庫\*/g, '') // 移除知識庫標記
      .replace(/💡\s*AI 搜尋回答/g, '') // 移除 AI 搜尋標記
      .replace(/【.*?】/g, '') // 移除【】內的文字
      .replace(/\[.*?\]/g, '') // 移除 [source] 等
      .replace(/source/gi, '') // 移除 source 文字
      .replace(/\*\*/g, '') // 移除粗體標記 **
      .replace(/✓|✗|●|►|•|💡/g, '') // 移除特殊符號
      .replace(/\n{2,}/g, '\n') // 多個換行改成單個
      .trim();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    }
    utterance.rate = 1.0;
    utterance.onstart = () => setIsDoctorSpeaking(true);
    utterance.onend = () => setIsDoctorSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsDoctorSpeaking(false);
  };

  const handleVoiceInput = (setInput) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (isRecording) { setIsRecording(false); return; }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-TW';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => { setIsRecording(true); setInput('正在聆聽...'); };
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      setInput(transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  return {
    isDoctorSpeaking,
    setIsDoctorSpeaking,
    isRecording,
    selectedVoice,
    ttsMode,
    googleVoice,
    audioRef,
    speak,
    stopSpeaking,
    handleVoiceInput,
  };
}
