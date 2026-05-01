import { describe, it, expect } from 'vitest';
import {
  createStableT,
  mockUseTranslationModule,
  STABLE_I18N_STRINGS,
} from './i18n-test-utils';

describe('i18n test utils', () => {
  it('createStableT returns mapped strings', () => {
    const t = createStableT({ 'foo.bar': 'Hello' });
    expect(t('foo.bar')).toBe('Hello');
    expect(t('unknown')).toBe('unknown');
  });

  it('mockUseTranslationModule exposes useTranslation with stable t()', () => {
    const mod = mockUseTranslationModule(STABLE_I18N_STRINGS);
    const { t } = mod.useTranslation();
    expect(typeof t === 'function').toBe(true);
    expect(t('common:logoutFlow.signingOut')).toBe('Signing out…');
  });
});
