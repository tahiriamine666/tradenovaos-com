import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CookieConsentPanel, { CookieSettingsButton } from '@/components/CookieConsent';
import { CookieConsentProvider, useOptionalConsentEffect } from '@/contexts/CookieConsentContext';
import { CONSENT_STORAGE_KEY, CONSENT_VERSION, parseConsent, readConsent, storeConsent } from '@/lib/cookieConsent';

function mount() {
  return render(<MemoryRouter><CookieConsentProvider><CookieSettingsButton /><CookieConsentPanel /></CookieConsentProvider></MemoryRouter>);
}
beforeEach(() => { localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('cookie consent', () => {
  it('shows once on first visit and never creates a second banner', () => {
    const view = mount();
    expect(screen.getAllByText('Your privacy matters')).toHaveLength(1);
    view.rerender(<MemoryRouter><CookieConsentProvider><CookieSettingsButton /><CookieConsentPanel /></CookieConsentProvider></MemoryRouter>);
    expect(screen.getAllByText('Your privacy matters')).toHaveLength(1);
  });
  it.each(['Accept All', 'Essential Only'])('persists %s and dismisses immediately and on remount', (choice) => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: choice }));
    expect(screen.queryByText('Your privacy matters')).not.toBeInTheDocument();
    expect(readConsent()).toMatchObject({ essential: true, analytics: choice === 'Accept All', marketing: choice === 'Accept All' });
    cleanup(); mount();
    expect(screen.queryByText('Your privacy matters')).not.toBeInTheDocument();
  });
  it('defaults optional categories off and allows later preference changes', () => {
    mount();
    fireEvent.click(screen.getAllByRole('button', { name: 'Cookie Settings' })[0]);
    expect(screen.getByRole('switch', { name: 'Analytics' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Marketing' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: /Essential cookies/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('switch', { name: 'Analytics' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Preferences' }));
    expect(readConsent()).toMatchObject({ analytics: true, marketing: false });
    fireEvent.click(screen.getByRole('button', { name: 'Cookie Settings' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Analytics' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Preferences' }));
    expect(readConsent()?.analytics).toBe(false);
  });
  it('requires renewed choice for invalid records and old policy versions', () => {
    expect(parseConsent('{broken')).toBeNull();
    const saved = storeConsent({ analytics: true, marketing: false });
    expect(parseConsent(JSON.stringify({ ...saved, version: CONSENT_VERSION - 1 }))).toBeNull();
    expect(parseConsent(JSON.stringify({ ...saved, essential: false }))).toBeNull();
    expect(parseConsent(JSON.stringify({ ...saved, analytics: 'yes' }))).toBeNull();
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ ...saved, version: 0 }));
    mount(); expect(screen.getByText('Your privacy matters')).toBeInTheDocument();
  });
  it('fails closed and explains blocked storage without dismissing the banner', () => {
    mount();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    fireEvent.click(screen.getByRole('button', { name: 'Accept All' }));
    expect(screen.getByRole('alert')).toHaveTextContent('could not save');
    expect(screen.getByText('Your privacy matters')).toBeInTheDocument();
    expect(readConsent()).toBeNull();
  });
  it('syncs another tab and re-requests consent when cleared', () => {
    mount();
    act(() => {
      storeConsent({ analytics: false, marketing: false });
      window.dispatchEvent(new StorageEvent('storage', { key: CONSENT_STORAGE_KEY }));
    });
    expect(screen.queryByText('Your privacy matters')).not.toBeInTheDocument();
    act(() => { localStorage.clear(); window.dispatchEvent(new StorageEvent('storage', { key: null })); });
    expect(screen.getByText('Your privacy matters')).toBeInTheDocument();
  });
  it('gates optional initialization and tears it down on revocation', () => {
    const teardown = vi.fn();
    const initialize = vi.fn(() => teardown);
    function Integration() { useOptionalConsentEffect('analytics', initialize); return null; }
    render(<MemoryRouter><CookieConsentProvider><Integration /><CookieSettingsButton /><CookieConsentPanel /></CookieConsentProvider></MemoryRouter>);
    expect(initialize).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Accept All' }));
    expect(initialize).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cookie Settings' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Analytics' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Preferences' }));
    expect(teardown).toHaveBeenCalledTimes(1);
  });
  it('does not touch auth or other app preferences', () => {
    localStorage.setItem('essential-session-test', 'unchanged');
    mount(); fireEvent.click(screen.getByRole('button', { name: 'Essential Only' }));
    expect(localStorage.getItem('essential-session-test')).toBe('unchanged');
  });
});