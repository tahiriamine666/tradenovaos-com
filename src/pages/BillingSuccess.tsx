import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePlan } from '@/hooks/usePlan';
import { Button } from '@/components/ui/button';
export default function BillingSuccess() {
  const [params]=useSearchParams();
  const attempt=params.get('attempt');
  const {refresh}=usePlan();
  const [phase,setPhase]=useState<'waiting'|'confirmed'|'timeout'>('waiting');
  const [plan,setPlan]=useState('');
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    let stopped=false,timer:ReturnType<typeof setTimeout>,count=0;
    setPhase('waiting');
    const tick=async()=>{
      if(!attempt) { setPhase('timeout'); return; }
      const {data,error}=await supabase.functions.invoke('dodo-checkout',{body:{action:'status',attempt_id:attempt}});
      if(stopped) return;
      if(!error&&data?.confirmed) { setPlan(data.plan); setPhase('confirmed'); await refresh(); return; }
      if(++count>=15) { setPhase('timeout'); return; }
      timer=setTimeout(tick,2000);
    };
    void tick();
    return ()=>{stopped=true;clearTimeout(timer);};
  },[attempt,refresh,retry]);
  return <main className="min-h-screen flex items-center justify-center bg-background p-6"><section className="max-w-md text-center space-y-5" aria-live="polite">
    <h1 className="text-2xl font-bold">{phase==='confirmed'?'Your subscription is confirmed':phase==='waiting'?'Confirming your subscription…':'Confirmation is still pending'}</h1>
    <p>{phase==='confirmed'?`Your ${plan==='elite'?'Elite':'Pro'} subscription is ready. View billing for your trial or renewal date.`:phase==='waiting'?'We are waiting for secure confirmation from Dodo Payments.':'We could not confirm this checkout yet. This does not mean you were charged. Check your billing status before trying another checkout.'}</p>
    {phase==='timeout'&&<Button onClick={()=>setRetry(n=>n+1)}>Check again</Button>}
    <div className="flex flex-col gap-3"><Link to={phase==='confirmed'?'/app':'/billing'}>{phase==='confirmed'?'Continue to TradeNova':'View billing status'}</Link><Link to="/billing">Manage billing</Link></div>
  </section></main>;
}
