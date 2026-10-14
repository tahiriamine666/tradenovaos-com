import { describe, expect, it } from 'vitest';
import { errorMessage } from './dataTypes';

describe('errorMessage', () => {
  it('preserves Error and provider error messages', () => {
    expect(errorMessage(new Error('Save failed'))).toBe('Save failed');
    expect(errorMessage({ message: 'Permission denied', code: '42501' })).toBe('Permission denied');
  });

  it('lets callers use their fallback for non-error thrown values', () => {
    for (const value of [undefined, null, false, 42, 'failure', {}, { message: 42 }]) {
      expect(errorMessage(value) ?? 'Could not save').toBe('Could not save');
    }
  });

  it('preserves an explicitly empty message', () => {
    expect(errorMessage({ message: '' })).toBe('');
  });
});
