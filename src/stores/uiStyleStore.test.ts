/**
 * Tests for uiStyleStore (legacy vs modern UI variant, persisted).
 *
 * Prerequisites: jsdom (sets `data-ui-style` on the html element).
 * Run: npx vitest run src/stores/uiStyleStore.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStyleStore } from './uiStyleStore';

describe('useUIStyleStore', () => {
  beforeEach(() => {
    useUIStyleStore.setState({ uiStyle: 'modern' });
    document.documentElement.removeAttribute('data-ui-style');
  });

  it('setUIStyle updates the store and the html attribute', () => {
    useUIStyleStore.getState().setUIStyle('legacy');
    expect(useUIStyleStore.getState().uiStyle).toBe('legacy');
    expect(document.documentElement.getAttribute('data-ui-style')).toBe(
      'legacy'
    );
  });

  it('toggleUIStyle flips between modern and legacy', () => {
    useUIStyleStore.getState().toggleUIStyle();
    expect(useUIStyleStore.getState().uiStyle).toBe('legacy');
    useUIStyleStore.getState().toggleUIStyle();
    expect(useUIStyleStore.getState().uiStyle).toBe('modern');
  });
});
