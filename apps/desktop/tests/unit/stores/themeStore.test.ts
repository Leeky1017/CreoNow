import { describe, expect, it, beforeEach } from 'vitest';
import { useThemeStore } from '../../../renderer/src/stores/ui/themeStore';

describe('themeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'dark' });
  });

  it('has dark as the default theme', () => {
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('setTheme updates the current theme', () => {
    useThemeStore.getState().setTheme('light');
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('setTheme accepts system theme', () => {
    useThemeStore.getState().setTheme('system');
    expect(useThemeStore.getState().theme).toBe('system');
  });
});
