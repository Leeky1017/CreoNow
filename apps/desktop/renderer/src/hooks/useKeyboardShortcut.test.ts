// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcut } from './useKeyboardShortcut';

function fireKey(key: string, modifiers: Partial<Pick<KeyboardEvent, 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>> = {}) {
  document.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      metaKey: modifiers.metaKey ?? false,
      ctrlKey: modifiers.ctrlKey ?? false,
      shiftKey: modifiers.shiftKey ?? false,
      altKey: modifiers.altKey ?? false,
    }),
  );
}

describe('useKeyboardShortcut', () => {
  it('calls handler on matching key press', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut('s', handler));

    fireKey('s');

    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not call handler for non-matching key', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut('s', handler));

    fireKey('a');

    expect(handler).not.toHaveBeenCalled();
  });

  it('requires meta modifier when specified', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut('s', handler, { meta: true }));

    fireKey('s');
    expect(handler).not.toHaveBeenCalled();

    fireKey('s', { metaKey: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('requires ctrl modifier when specified', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut('s', handler, { ctrl: true }));

    fireKey('s');
    expect(handler).not.toHaveBeenCalled();

    fireKey('s', { ctrlKey: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('requires shift modifier when specified', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut('p', handler, { shift: true }));

    fireKey('p');
    expect(handler).not.toHaveBeenCalled();

    fireKey('p', { shiftKey: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('supports combined modifiers', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut('s', handler, { ctrl: true, shift: true }));

    fireKey('s', { ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();

    fireKey('s', { ctrlKey: true, shiftKey: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('stops listening after unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcut('s', handler));

    unmount();
    fireKey('s');

    expect(handler).not.toHaveBeenCalled();
  });

  it('matches keys case-insensitively', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut('S', handler));

    fireKey('s');

    expect(handler).toHaveBeenCalledOnce();
  });
});
