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
