import { describe, it, expect } from 'vitest';
import { parseMessage } from '../utils/parseMessage';

describe('parseMessage', () => {
  it('returns empty content and no suggestions for null input', () => {
    expect(parseMessage(null)).toEqual({ content: '', suggestions: [] });
    expect(parseMessage(undefined)).toEqual({ content: '', suggestions: [] });
    expect(parseMessage('')).toEqual({ content: '', suggestions: [] });
  });

  it('returns "..." for ellipsis input', () => {
    expect(parseMessage('...')).toEqual({ content: '...', suggestions: [] });
  });

  it('parses message without suggestions', () => {
    const result = parseMessage('這是一般訊息');
    expect(result.content).toBe('這是一般訊息');
    expect(result.suggestions).toEqual([]);
  });

  it('parses message with suggestions separated by ///', () => {
    const result = parseMessage('回答內容/// 建議一 | 建議二 | 建議三');
    expect(result.content).toBe('回答內容');
    expect(result.suggestions).toEqual(['建議一', '建議二', '建議三']);
  });

  it('filters source markers【...source...】', () => {
    const result = parseMessage('重要內容【4:5†source】更多內容');
    expect(result.content).toBe('重要內容更多內容');
  });

  it('filters bracket source markers [...source...]', () => {
    const result = parseMessage('重要內容[4:1†source]更多');
    expect(result.content).toBe('重要內容更多');
  });

  it('strips numbered prefixes from suggestions', () => {
    const result = parseMessage('回答/// 1. 問題一 | 2. 問題二 | 3. 問題三');
    expect(result.suggestions).toEqual(['問題一', '問題二', '問題三']);
  });

  it('removes guidance text like 後續建議：', () => {
    const result = parseMessage('回答/// 後續建議：問題一 | 問題二');
    expect(result.suggestions).toEqual(['問題一', '問題二']);
  });

  it('handles fullwidth separator ｜', () => {
    const result = parseMessage('回答/// 問題一｜問題二｜問題三');
    expect(result.suggestions).toEqual(['問題一', '問題二', '問題三']);
  });

  it('handles newlines in suggestions section', () => {
    const result = parseMessage('回答///\n問題一\n問題二\n問題三');
    expect(result.suggestions).toEqual(['問題一', '問題二', '問題三']);
  });

  it('filters empty suggestions', () => {
    const result = parseMessage('回答/// | 問題一 | | 問題二 | ');
    expect(result.suggestions).toEqual(['問題一', '問題二']);
  });
});
