import { useState, useEffect, useRef, useCallback } from 'react';

export function useSpeech() {
  const [isDoctorSpeaking, setIsDoctorSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [ttsMode, setTtsMode] = useState('browser');
  const [googleVoice, setGoogleVoice] = useState('tw-male-1');
  const audioRef = useRef(null);

  // KTV 字幕：目前已顯示的字元索引
  const [revealedIndex, setRevealedIndex] = useState(-1);
  const [currentSpeechText, setCurrentSpeechText] = useState('');
  const revealTimerRef = useRef(null);
  const checkIntervalRef = useRef(null);

  // 記錄是否確認為男聲
  const isConfirmedMale = useRef(false);

  useEffect(() => {
    const loadVoices = () => {
      const all = window.speechSynthesis.getVoices();

      const chinese = all.filter(v =>
        v.lang.includes('zh') ||
        v.lang.includes('CN') ||
        v.lang.includes('TW') ||
        v.lang.includes('nan')
      );

      // 女聲黑名單
      const femaleNames = ['ting-ting', 'sin-ji', 'mei-jia', 'ya-ling', 'female', '女', 'woman', '女性'];

      // 1. 優先：志偉語音
      const zhiwei = chinese.find(v =>
        v.name.toLowerCase().includes('zhiwei') || v.name.includes('志偉')
      );

      // 2. 次選：男聲
      const maleChinese = chinese.find(v => {
        const lowerName = v.name.toLowerCase();
        const zhName = v.name;
        return (
          lowerName.includes('male') ||
          zhName.includes('男') ||
          zhName.includes('男聲') ||
          lowerName.includes('yunyang') ||
          lowerName.includes('云揚') ||
          lowerName.includes('man') ||
          zhName.includes('- 男')
        );
      });

      // 3. 備選：排除女聲
      const notFemale = chinese.find(v => {
        const lowerName = v.name.toLowerCase();
        return !femaleNames.some(fn => lowerName.includes(fn.toLowerCase()));
      });

      if (zhiwei) {
        setSelectedVoice(zhiwei);
        isConfirmedMale.current = true;
      } else if (maleChinese) {
        setSelectedVoice(maleChinese);
        isConfirmedMale.current = true;
      } else if (notFemale) {
        setSelectedVoice(notFemale);
        isConfirmedMale.current = false; // 不確定性別
      } else if (chinese.length > 0) {
        setSelectedVoice(chinese[0]);
        isConfirmedMale.current = false;
      }
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  const speak = useCallback((rawText) => {
    window.speechSynthesis.cancel();

    // 清理文字
    let textToSpeak = rawText.split('///')[0];
    textToSpeak = textToSpeak
      .replace(/✓\s*\*此回答基於專業知識庫\*/g, '')
      .replace(/💡\s*AI 搜尋回答/g, '')
      .replace(/【.*?】/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/source/gi, '')
      .replace(/\*\*/g, '')
      .replace(/✓|✗|●|►|•|💡/g, '')
      .replace(/\n{2,}/g, '\n')
      .trim();

    // 設定 KTV 字幕文字
    setCurrentSpeechText(textToSpeak);
    setRevealedIndex(0);

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    }

    // Pitch 補償：確認男聲用 0.9，不確定或女聲用 0.7（讓聲音更低沉）
    utterance.rate = 1.0;
    utterance.pitch = isConfirmedMale.current ? 0.9 : 0.7;

    // KTV 字幕：嘗試用 onboundary 精確同步
    let hasReceivedBoundary = false;
    utterance.onboundary = (event) => {
      if (event.charIndex !== undefined) {
        hasReceivedBoundary = true;
        setRevealedIndex(event.charIndex + (event.charLength || 1));
      }
    };

    utterance.onstart = () => {
      setIsDoctorSpeaking(true);

      // Fallback：500ms 後如果沒收到 boundary 事件，用估時逐字顯示
      setTimeout(() => {
        if (!hasReceivedBoundary && textToSpeak.length > 0) {
          const msPerChar = 220; // 中文語音約每字 220ms
          let idx = 0;
          revealTimerRef.current = setInterval(() => {
            idx += 1;
            setRevealedIndex(Math.min(idx, textToSpeak.length));
            if (idx >= textToSpeak.length) {
              clearInterval(revealTimerRef.current);
            }
          }, msPerChar);
        }
      }, 500);
    };

    utterance.onend = () => {
      setIsDoctorSpeaking(false);
      setRevealedIndex(textToSpeak.length); // 顯示全部
      if (revealTimerRef.current) clearInterval(revealTimerRef.current);
    };
    utterance.onerror = () => {
      setIsDoctorSpeaking(false);
      setRevealedIndex(textToSpeak.length);
      if (revealTimerRef.current) clearInterval(revealTimerRef.current);
    };

    window.speechSynthesis.speak(utterance);

    // Chrome bug 修正
    checkIntervalRef.current = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        setIsDoctorSpeaking(false);
        setRevealedIndex(textToSpeak.length);
        clearInterval(checkIntervalRef.current);
        if (revealTimerRef.current) clearInterval(revealTimerRef.current);
      }
    }, 500);

    setTimeout(() => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (revealTimerRef.current) clearInterval(revealTimerRef.current);
      if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
      setIsDoctorSpeaking(false);
      setRevealedIndex(textToSpeak.length);
    }, 60000);
  }, [selectedVoice]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsDoctorSpeaking(false);
    if (currentSpeechText) setRevealedIndex(currentSpeechText.length);
    if (revealTimerRef.current) clearInterval(revealTimerRef.current);
    if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
  }, [currentSpeechText]);

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
    revealedIndex,
    currentSpeechText,
  };
}
