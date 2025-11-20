import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectOS, detectBrowser, getBrowserDisplayName, getOSDisplayName } from './detectPlatform';

describe('detectPlatform', () => {
  beforeEach(() => {
    // Reset navigator mocks before each test
    vi.resetAllMocks();
  });

  describe('detectOS', () => {
    it('should detect macOS', () => {
      Object.defineProperty(window.navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });
      expect(detectOS()).toBe('mac');
    });

    it('should detect Windows', () => {
      Object.defineProperty(window.navigator, 'platform', {
        value: 'Win32',
        configurable: true,
      });
      expect(detectOS()).toBe('windows');
    });

    it('should detect Linux', () => {
      Object.defineProperty(window.navigator, 'platform', {
        value: 'Linux x86_64',
        configurable: true,
      });
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (X11; Linux x86_64)',
        configurable: true,
      });
      expect(detectOS()).toBe('linux');
    });
  });

  describe('getBrowserDisplayName', () => {
    it('should return correct display names', () => {
      expect(getBrowserDisplayName('chrome')).toBe('Chrome');
      expect(getBrowserDisplayName('firefox')).toBe('Firefox');
      expect(getBrowserDisplayName('safari')).toBe('Safari');
      expect(getBrowserDisplayName('edge')).toBe('Edge');
      expect(getBrowserDisplayName('unknown')).toBe('Browser');
    });
  });

  describe('getOSDisplayName', () => {
    it('should return correct display names', () => {
      expect(getOSDisplayName('mac')).toBe('macOS');
      expect(getOSDisplayName('windows')).toBe('Windows');
      expect(getOSDisplayName('linux')).toBe('Linux');
      expect(getOSDisplayName('unknown')).toBe('Desktop');
    });
  });
});

