import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import MarketingPageShell from './MarketingPageShell';
import SeoHead from '@/components/SeoHead';

export default function Contact() {
  const { user, loading } = useAuth();
  const [subject,setSubject]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [sent,setSent]=useState(false);
  const [error,setError]=useState('');
  async function submit(event:React.FormEvent) {
    event.preventDefault();
    if(!user?.email || !subject.trim() || !message.trim()) return;
    setBusy(true);setError('');
    try {
      const {error}=await supabase.from('support_messages').insert({
        user_id:user.id,email:user.email,
        name:String(user.user_metadata?.display_name||user.user_metadata?.full_name||'TradeNova member').slice(0,100),
        subject:subject.trim(),message:message.trim()
      });
      if(error) throw error;
      setSent(true);setMessage('');
    } catch {setError('Your message was not sent. Please try again.');}
    finally {setBusy(false);}
  }
  return <>
    <SeoHead path="/contact" title="Contact Support — TradeNova OS" description="Get help with your TradeNova account, billing, and trading journal." />
    <MarketingPageShell eyebrow="Support" title="Contact TradeNova" description="Send an account or billing question to the TradeNova support team.">
      <div className="mx-auto max-w-xl text-left space-y-5">
        <p>For billing questions, include the date and plan involved. Do not include passwords, API keys, investor credentials, or card numbers.</p>
        {loading?<p role="status">Loading your account…</p>:sent?<p role="status">Your support request has been saved. The team can review it from your account.</p>:user?<form onSubmit={submit} className="space-y-4">
          <label className="block">Subject<Input required maxLength={150} value={subject} onChange={e=>setSubject(e.target.value)} /></label>
          <label className="block">How can we help?<Textarea required maxLength={5000} rows={6} value={message} onChange={e=>setMessage(e.target.value)} /></label>
          {error&&<p role="alert">{error}</p>}
          <Button disabled={busy} type="submit">{busy?'Sending…':'Send support request'}</Button>
        </form>:<p><Link className="underline" to="/login">Sign in</Link> to send a support request linked to your account. For sign-in problems, use the password recovery link on the login page.</p>}
        <p><Link className="underline" to="/billing">Manage your subscription and billing</Link></p>
      </div>
    </MarketingPageShell>
  </>;
}
