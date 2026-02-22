// src/lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('should merge class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional class names', () => {
    expect(cn('foo', { bar: true, baz: false })).toBe('foo bar');
  });

  it('should merge with tailwind-merge correctly for conflicting classes', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2'); // tailwind-merge should resolve this
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });

  it('should handle various input types', () => {
    expect(
      cn('foo', null, 'bar', undefined, { baz: true, qux: false }, [
        'hello',
        'world',
      ])
    ).toBe('foo bar baz hello world');
  });
});
