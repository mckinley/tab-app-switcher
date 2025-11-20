import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      const condition = false;
      expect(cn('foo', condition && 'bar', 'baz')).toBe('foo baz');
    });

    it('should merge tailwind classes correctly', () => {
      // twMerge should deduplicate conflicting classes
      expect(cn('px-2', 'px-4')).toBe('px-4');
    });

    it('should handle empty input', () => {
      expect(cn()).toBe('');
    });

    it('should handle arrays', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('should handle objects', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });
  });
});

