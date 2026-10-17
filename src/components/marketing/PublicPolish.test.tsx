import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CookieConsentProvider } from '@/contexts/CookieConsentContext';
import MarketingFooter from './MarketingFooter';
import HomepageTraderFeedback from './HomepageTraderFeedback';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
afterEach(cleanup);
beforeEach(() => rpc.mockReset());
describe('public homepage polish', () => {
  it('links only supported footer destinations and keeps cookie settings accessible', () => {
    render(<MemoryRouter><CookieConsentProvider><MarketingFooter homepage /></CookieConsentProvider></MemoryRouter>);
    const footer=screen.getByRole('contentinfo');
    for(const [name,url] of [['Features','/#features'],['Integrations','/#integrations'],['NOVA AI','/how-nova-works'],['Free Psychology Audit','/psychology-audit'],['About','/about'],['FAQ','/faq'],['Contact','/contact'],['Risk Disclaimer','/risk-disclaimer']]) expect(within(footer).getByRole('link',{name})).toHaveAttribute('href',url);
    expect(screen.queryByRole('link',{name:'Affiliates'})).toBeNull();
    expect(screen.queryByRole('link',{name:'Terms of Service'})).toBeNull();
    expect(screen.getByRole('button',{name:/Cookie Settings/i})).toBeTruthy();
  });
  it('labels each fictional card and never shows fictional rating stars', async () => {
    rpc.mockResolvedValue({data:[],error:null});
    render(<HomepageTraderFeedback />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(await screen.findAllByText('Fictional example · Not a customer review')).toHaveLength(8);
    expect(screen.queryByLabelText(/out of 5/)).toBeNull();
    expect(screen.getAllByRole('button',{name:'Share Your Feedback'})).toHaveLength(1);
  });
  it('retries read failures and replaces fictional examples with only approved endpoint results', async () => {
    rpc.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({data:[{id:'qa',display_name:'QA approved fixture',trading_category:null,rating:4,message:'Test fixture from the approved endpoint.'}],error:null});
    render(<HomepageTraderFeedback />);
    expect(await screen.findByRole('alert')).toHaveTextContent('couldn’t load');
    fireEvent.click(screen.getByRole('button',{name:'Try again'}));
    expect(await screen.findByText('QA approved fixture')).toBeTruthy();
    await waitFor(()=>expect(screen.queryByText('Fictional example · Not a customer review')).toBeNull());
    expect(screen.getByLabelText('Rated 4 out of 5')).toBeTruthy();
    expect(rpc).toHaveBeenCalledWith('get_approved_trader_feedback');
  });
});
