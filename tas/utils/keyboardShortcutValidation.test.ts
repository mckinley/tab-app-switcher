import { describe, it, expect } from 'vitest';
import { validateShortcut, validateAllShortcuts, getShortcutWarning } from './keyboardShortcutValidation';

describe('keyboardShortcutValidation', () => {
  describe('validateShortcut', () => {
    it('should validate a valid shortcut', () => {
      const result = validateShortcut('Alt', 'Tab', 'Test');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect browser shortcuts', () => {
      const result = validateShortcut('Cmd', 'W', 'Test');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('browser shortcut');
    });

    it('should warn about macOS Option special characters', () => {
      const result = validateShortcut('Alt', 'A', 'Test');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Option+A');
    });

    it('should detect empty keys', () => {
      const result = validateShortcut('Alt', '', 'Test');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('cannot be empty');
    });
  });

  describe('validateAllShortcuts', () => {
    it('should validate all shortcuts successfully', () => {
      const shortcuts = {
        modifier: 'Alt',
        activateForward: 'Tab',
        activateBackward: 'Q',
        closeTab: 'W',
        search: 'S',
      };
      const result = validateAllShortcuts(shortcuts);
      expect(result.isValid).toBe(true);
    });

    it('should detect duplicate keys', () => {
      const shortcuts = {
        modifier: 'Alt',
        activateForward: 'Tab',
        activateBackward: 'Tab',
        closeTab: 'W',
        search: 'S',
      };
      const result = validateAllShortcuts(shortcuts);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate keys'))).toBe(true);
    });
  });

  describe('getShortcutWarning', () => {
    it('should return null for valid shortcuts', () => {
      expect(getShortcutWarning('Alt', 'Tab')).toBeNull();
    });

    it('should return error message for browser shortcuts', () => {
      const warning = getShortcutWarning('Cmd', 'W');
      expect(warning).toContain('❌');
      expect(warning).toContain('browser shortcut');
    });

    it('should return warning for macOS special characters', () => {
      const warning = getShortcutWarning('Alt', 'A');
      expect(warning).toContain('⚠️');
    });
  });
});

