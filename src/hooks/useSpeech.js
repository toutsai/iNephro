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

  // 偵測是否為行動裝置（用 Google Cloud TTS 男聲取代瀏覽器女聲）
  const isMobileDevice = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const speak = useCallback((rawText) => {
    window.speechSynthesis.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }

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

    // KTV 字幕計時器（接受速度參數）
    const startKTVTimer = (msPerChar = 200) => {
      if (revealTimerRef.current) clearInterval(revealTimerRef.current);
      let idx = 0;
      revealTimerRef.current = setInterval(() => {
        idx += 1;
        setRevealedIndex(Math.min(idx, textToSpeak.length));
        if (idx >= textToSpeak.length) clearInterval(revealTimerRef.current);
      }, msPerChar);
    };

    const finishSpeaking = () => {
      setIsDoctorSpeaking(false);
      setRevealedIndex(textToSpeak.length);
      if (revealTimerRef.current) clearInterval(revealTimerRef.current);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };

    // === 行動版：用 Google Cloud TTS 台灣男聲 ===
    if (isMobileDevice && !isConfirmedMale.current) {
      setIsDoctorSpeaking(true);
      startKTVTimer(250); // Google Cloud TTS 語速較慢，250ms/字

      fetch('/api/tts-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak.substring(0, 5000), voice: 'tw-male-1' })
      })
        .then(res => {
          if (!res.ok) throw new Error('TTS API error');
          return res.blob();
        })
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => { finishSpeaking(); URL.revokeObjectURL(url); };
          audio.onerror = () => { finishSpeaking(); URL.revokeObjectURL(url); };
          audio.play().catch(() => {
            // iOS 可能需要使用者手勢才能播放，降級到瀏覽器 TTS
            finishSpeaking();
            speakWithBrowser(textToSpeak, startKTVTimer, finishSpeaking);
          });
        })
        .catch(() => {
          // Google Cloud TTS 失敗，降級到瀏覽器 TTS
          speakWithBrowser(textToSpeak, startKTVTimer, finishSpeaking);
        });

      return;
    }

    // === 桌面版/已確認男聲：用瀏覽器原生 TTS ===
    speakWithBrowser(textToSpeak, startKTVTimer, finishSpeaking);
  }, [selectedVoice, isMobileDevice]);

  // 瀏覽器原生 TTS（桌面版或降級用）
  const speakWithBrowser = useCallback((textToSpeak, startKTVTimer, finishSpeaking) => {
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    }
    utterance.rate = 1.0;
    utterance.pitch = isConfirmedMale.current ? 0.9 : 0.7;

    let hasReceivedBoundary = false;
    utterance.onboundary = (event) => {
      if (event.charIndex !== undefined) {
        hasReceivedBoundary = true;
        setRevealedIndex(event.charIndex + (event.charLength || 1));
      }
    };

    utterance.onstart = () => {
      setIsDoctorSpeaking(true);
      setTimeout(() => {
        if (!hasReceivedBoundary && textToSpeak.length > 0) {
          startKTVTimer();
        }
      }, 500);
    };

    utterance.onend = () => finishSpeaking();
    utterance.onerror = () => finishSpeaking();
    window.speechSynthesis.speak(utterance);

    // Chrome onend bug 修正
    checkIntervalRef.current = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        finishSpeaking();
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
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
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
