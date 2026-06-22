import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getChatErrorMessage, useChat } from '../hooks/useChat';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

describe('useChat error handling', () => {
  it('disables sending while a chat request is in flight', async () => {
    let resolveFetch;
    vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => {
      resolveFetch = resolve;
    })));
    const speak = vi.fn();
    const { result } = renderHook(() => useChat(speak));

    await act(async () => {
      result.current.handleSend('蛋白尿是什麼？');
    });

    expect(result.current.isSending).toBe(true);
    expect(result.current.messages.filter(message => message.role === 'patient')).toHaveLength(1);

    await act(async () => {
      result.current.handleSend('慢性腎臟病是什麼？');
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.current.messages.filter(message => message.role === 'patient')).toHaveLength(1);

    await act(async () => {
      resolveFetch(new Response(JSON.stringify({
        reply: '蛋白尿代表尿液中有過多蛋白質。',
        confidence: 'medium',
        sources: [],
        fromCache: false,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    });

    await waitFor(() => {
      expect(result.current.isSending).toBe(false);
      expect(result.current.messages.at(-1).text).toContain('蛋白尿代表');
    });
  });

  it('maps unknown chat failures to a displayable unavailable state', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: 'Invalid question' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )));
    const speak = vi.fn();
    const { result } = renderHook(() => useChat(speak));

    await act(async () => {
      await result.current.callAI('腎臟病要注意什麼？');
    });

    await waitFor(() => {
      const lastMessage = result.current.messages.at(-1);
      expect(lastMessage.text).toContain('知識庫服務暫時無法回覆');
      expect(lastMessage.confidence).toBe('unavailable');
      expect(speak).toHaveBeenCalledWith(expect.stringContaining('知識庫服務暫時無法回覆'));
    });
  });

  it('does not expose the generic system error copy', () => {
    expect(getChatErrorMessage(new Error('Unexpected failure'))).not.toContain('系統發生錯誤');
    expect(getChatErrorMessage(new Error('Unexpected failure'))).toContain('知識庫服務暫時無法回覆');
  });
});
