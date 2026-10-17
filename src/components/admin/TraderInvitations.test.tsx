import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/invitations',()=>({invitationRequest:vi.fn(),invitationMessages:{}}));
import { invitationRequest } from '@/lib/invitations';
import TraderInvitations from './TraderInvitations';
beforeEach(()=>{ vi.mocked(invitationRequest).mockReset(); vi.mocked(invitationRequest).mockResolvedValue({invitations:[]}); });
it('offers all supported plans and durations in a labeled modal',async()=>{
  render(<TraderInvitations/>); await screen.findByText('No matching invitations.');
  fireEvent.click(screen.getByRole('button',{name:'Invite Trader'}));
  expect(screen.getByLabelText('Trader email')).toBeRequired();
  expect(screen.getByLabelText('Plan')).toHaveTextContent('ProElite');
  expect(screen.getByLabelText('Access duration')).toHaveTextContent('365 days');
  fireEvent.change(screen.getByLabelText('Access duration'),{target:{value:'custom'}});
  expect(screen.getByLabelText('Expiration (your local time)')).toBeRequired();
});
it('submits invitation fields without an actor or user ID',async()=>{
  render(<TraderInvitations/>); await screen.findByText('No matching invitations.');
  fireEvent.click(screen.getByRole('button',{name:'Invite Trader'}));
  fireEvent.change(screen.getByLabelText('Trader email'),{target:{value:'trader@example.test'}});
  fireEvent.click(screen.getByRole('button',{name:'Send Invitation'}));
  await waitFor(()=>expect(invitationRequest).toHaveBeenCalledWith(expect.objectContaining({action:'create',email:'trader@example.test',duration_days:30,plan:'pro'})));
});
it('shows service failures without a false success state',async()=>{
  vi.mocked(invitationRequest).mockRejectedValue(new Error('Service unavailable'));
  render(<TraderInvitations/>); expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable');
  expect(screen.queryByText('Invitation sent.')).not.toBeInTheDocument();
});
