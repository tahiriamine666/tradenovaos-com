import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('@/contexts/AuthContext',()=>({useAuth:vi.fn()}));
vi.mock('@/lib/invitations',()=>({readPendingInvitation:vi.fn()}));
import { useAuth } from '@/contexts/AuthContext';
import { readPendingInvitation } from '@/lib/invitations';
import InvitationContinuation from './InvitationContinuation';
beforeEach(()=>{ vi.mocked(useAuth).mockReturnValue({user:{id:'test'},loading:false,recoverySessionId:null} as ReturnType<typeof useAuth>); vi.mocked(readPendingInvitation).mockReturnValue('a'.repeat(64)); });
function mount(path:string){render(<MemoryRouter initialEntries={[path]}><InvitationContinuation><Routes><Route path="/accept-invitation" element={<p>Invitation acceptance</p>}/><Route path="*" element={<p>Original flow</p>}/></Routes></InvitationContinuation></MemoryRouter>);}
it('resumes an invitation after managed Google redirects to the root',()=>{mount('/'); expect(screen.getByText('Invitation acceptance')).toBeInTheDocument();});
it('keeps normal app navigation unchanged without an invitation',()=>{vi.mocked(readPendingInvitation).mockReturnValue(null);mount('/app');expect(screen.getByText('Original flow')).toBeInTheDocument();});
it('never interrupts password recovery',()=>{mount('/reset-password');expect(screen.getByText('Original flow')).toBeInTheDocument();});
it('never interrupts a recovery session on root',()=>{vi.mocked(useAuth).mockReturnValue({user:{id:'test'},loading:false,recoverySessionId:'test'} as ReturnType<typeof useAuth>);mount('/');expect(screen.getByText('Original flow')).toBeInTheDocument();});
