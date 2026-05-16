/**
 * Tests for languageStore (locale + RTL).
 *
 * Prerequisites: mocks `@/i18n` so the store does not initialise the full
 * i18next stack during the test.
 * Run: npx vitest run src/stores/languageStore.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { changeLanguage } = vi.hoisted(() => ({ changeLanguage: vi.fn() }));

vi.mock('@/i18n', () => ({
  default: {
    language: 'fr',
    changeLanguage,
  },
  supportedLanguages: ['fr', 'en'] as const,
  languageConfig: {
    fr: { dir: 'ltr' },
    en: { dir: 'ltr' },
  },
}));

import { useLanguageStore } from './languageStore';

describe('useLanguageStore', () => {
  beforeEach(() => {
    useLanguageStore.setState({ locale: 'fr' });
    changeLanguage.mockReset();
  });

  it('setLocale updates the store, i18n, and html attributes', () => {
    useLanguageStore.getState().setLocale('en');
    expect(useLanguageStore.getState().locale).toBe('en');
    expect(changeLanguage).toHaveBeenCalledWith('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('setLocale rejects unsupported codes and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    useLanguageStore.getState().setLocale('zz' as unknown as 'fr');
    expect(useLanguageStore.getState().locale).toBe('fr');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('isRTL is false for LTR languages', () => {
    useLanguageStore.getState().setLocale('en');
    expect(useLanguageStore.getState().isRTL()).toBe(false);
  });
});
