import { fireEvent, render, screen, within, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { afterEach, describe, expect, it } from 'vitest';
import { CookieConsentProvider } from '@/contexts/CookieConsentContext';
import PsychologyAudit from './PsychologyAudit';
import { FaqPage, AboutPage, HowNovaWorksPage, SecurityPage } from './InformationPages';
import { INFORMATION_LINKS } from './informationLinks';

afterEach(cleanup);
function show(page: React.ReactNode) { return render(<HelmetProvider><MemoryRouter><CookieConsentProvider>{page}</CookieConsentProvider></MemoryRouter></HelmetProvider>); }
describe('public information pages', () => {
  it('provides all five discoverable destinations without an auth context', () => {
    show(<SecurityPage />);
    const nav = screen.getByRole('navigation', { name: 'Information pages' });
    for (const item of INFORMATION_LINKS) expect(within(nav).getByRole('link', { name: item.label })).toHaveAttribute('href', item.path);
  });
  it('opens and closes FAQ answers', () => {
    show(<FaqPage />);
    const question = screen.getByRole('button', { name: 'Can I connect my MT5 broker?' });
    fireEvent.click(question);
    expect(question).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/MT5 Auto Sync is Coming Soon and is not currently available/)).toBeVisible();
    fireEvent.click(question);
    expect(question).toHaveAttribute('aria-expanded', 'false');
  });
  it('requires completion, calculates results, invalidates edited results and resets', () => {
    show(<PsychologyAudit />);
    fireEvent.click(screen.getByRole('button', { name: 'See my reflection' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please answer all 12');
    screen.getAllByRole('radio', { name: 'Consistently' }).forEach(radio => fireEvent.click(radio));
    fireEvent.click(screen.getByRole('button', { name: 'See my reflection' }));
    expect(screen.getByRole('heading', { name: 'Your reflection score: 100/100' })).toBeVisible();
    fireEvent.click(screen.getAllByRole('radio', { name: 'Never' })[0]);
    expect(screen.queryByRole('heading', { name: /Your reflection score/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reset answers' }));
    expect(screen.getAllByRole('radio').every(radio => !(radio as HTMLInputElement).checked)).toBe(true);
  });
  it('does not retain answers after leaving and reopening the assessment', () => {
    const view = show(<PsychologyAudit />);
    fireEvent.click(screen.getAllByRole('radio', { name: 'Often' })[0]);
    view.unmount(); show(<PsychologyAudit />);
    expect(screen.getByText('0 of 12 answered')).toBeVisible();
  });
  it('preserves the founder portrait and labels the example conversation', () => {
    const about = show(<AboutPage />);
    expect(screen.getByAltText('Portrait of the TradeNovaOS founder')).toHaveAttribute('src');
    about.unmount(); show(<HowNovaWorksPage />);
    expect(screen.getByText('ILLUSTRATIVE CONVERSATION · NOT A LIVE RESULT')).toBeVisible();
  });
});
