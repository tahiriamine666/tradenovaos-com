import { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toKey } from './DatedChecklist';

interface Props {
  userId: string;
  selectedDate: string;
  onSelect: (date: string) => void;
  refresh: number;
}

export default function PlanHistoryCalendar({ userId, selectedDate, onSelect, refresh }: Props) {
  const [month, setMonth] = useState(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [error, setError] = useState(false);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = toKey(new Date(year, monthIndex, 1));
  const last = toKey(new Date(year, monthIndex + 1, 0));

  useEffect(() => {
    let active = true;
    setSaved(new Set());
    setError(false);
    supabase.from('trade_plans').select('plan_date').eq('user_id', userId)
      .gte('plan_date', first).lte('plan_date', last).then(({ data, error: err }) => {
        if (!active) return;
        setError(!!err);
        if (!err) setSaved(new Set((data ?? []).map(row => row.plan_date)));
      });
    return () => { active = false; };
  }, [userId, first, last, refresh]);

  const offset = new Date(year, monthIndex, 1).getDay();
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const today = toKey(new Date());

  return (
    <section aria-label="Plan History" className="mb-4 border-b border-border pb-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="text-xs font-bold text-foreground flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Plan History</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Previous month" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className={`w-28 text-center text-xs font-semibold ${year === new Date().getFullYear() && monthIndex === new Date().getMonth() ? 'text-primary' : 'text-foreground'}`}>
            {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Next month" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 max-w-sm gap-0.5 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, i) => <span key={i} className="text-[10px] text-muted-foreground py-1">{day}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`pad-${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const date = toKey(new Date(year, monthIndex, i + 1));
          return <Button key={date} variant="ghost" size="icon" aria-label={`${date}${saved.has(date) ? ', saved plan' : ''}`} aria-pressed={selectedDate === date}
            onClick={() => onSelect(date)} className={`relative h-8 w-full rounded-sm text-xs font-medium transition-colors duration-300 ${selectedDate === date ? 'bg-primary/15 text-primary ring-1 ring-primary/40' : date === today ? 'text-primary' : 'text-foreground/70'}`}>
            {i + 1}{saved.has(date) && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />}
          </Button>;
        })}
      </div>
      {error && <p className="text-xs text-destructive mt-2">Could not load plan history.</p>}
    </section>
  );
}