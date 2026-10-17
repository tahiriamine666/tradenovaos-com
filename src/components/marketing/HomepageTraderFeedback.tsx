import { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { approvedFeedbackSchema, feedbackErrorMessages, feedbackSchema } from '@/lib/traderFeedback';

type Review = { id: string; display_name: string; trading_category: string | null; rating: number | null; message: string };

export const DEMO_REVIEWS: Review[] = [
  { id: 'demo-alex', display_name: 'Alex M.', trading_category: 'Forex trader', rating: null, message: 'The notes beside each trade are what I keep coming back to. A green day alone doesn’t explain whether I made a good decision.' },
  { id: 'demo-sam', display_name: 'Sam R.', trading_category: 'Futures trader', rating: null, message: 'Writing the scenario before the session feels much clearer than trying to remember what I was thinking after the entry.' },
  { id: 'demo-jordan', display_name: 'Jordan K.', trading_category: 'Swing trader', rating: null, message: 'I like having a place to record my mindset, not just the numbers. The emotional context matters when I review a trade.' },
  { id: 'demo-taylor', display_name: 'Taylor B.', trading_category: 'Index futures trader', rating: null, message: 'A weekly view next to my daily preparation is the kind of structure I want. It keeps the bigger picture separate from today’s setup.' },
  { id: 'demo-casey', display_name: 'Casey L.', trading_category: 'Day trader', rating: null, message: 'Win rate is the first number I look at, but expectancy gives me another angle. I want my journal to show both.' },
  { id: 'demo-morgan', display_name: 'Morgan P.', trading_category: 'Commodities trader', rating: null, message: 'Seeing sessions on a calendar makes it easier to find the day I want to revisit. Small details like that make a journal feel organized.' },
  { id: 'demo-riley', display_name: 'Riley T.', trading_category: 'Position trader', rating: null, message: 'I prefer reviewing trades in R rather than comparing cash results alone. Position size shouldn’t hide the quality of the setup.' },
  { id: 'demo-jamie', display_name: 'Jamie C.', trading_category: 'Part-time trader', rating: null, message: 'A short checklist suits my routine. I’d rather pause for a few specific questions than rush into a trade and write the explanation later.' },
];

export function selectFeedbackReviews(approved: Review[] | null) {
  const isDemo = !approved?.length;
  return { isDemo, displayed: isDemo ? DEMO_REVIEWS : approved ?? [] };
}

function Stars({ rating, demo = false }: { rating: number; demo?: boolean }) {
  return (
    <div className="flex gap-1 mb-5" aria-label={`${demo ? 'Fictional demo rating: ' : 'Rated '}${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map(n => <Star key={n} className={`h-4 w-4 ${n <= rating ? 'fill-primary text-primary' : 'text-muted-foreground/40'}`} />)}
    </div>
  );
}

function ReviewCard({ review, index, demo = false }: { review: Review; index: number; demo?: boolean }) {
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    card.dataset.reveal = 'pending';
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        card.dataset.reveal = 'visible';
        observer.disconnect();
      }
    }, { threshold: 0.08 });
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  const hasRating = !demo && review.rating !== null && Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5;
  return (
    <article ref={cardRef} className="home-feedback-reveal" data-stagger={index % 6}>
      <div className="home-feedback-card">
        {demo && <p className="home-feedback-demo-marker">Fictional example · Not a customer review</p>}
        {hasRating && review.rating !== null ? <Stars rating={review.rating} demo={demo} /> : null}
        <blockquote className="home-feedback-text">“{review.message}”</blockquote>
        <div className="home-feedback-attribution">
          <p>{review.display_name}</p>
          {review.trading_category && <p className="home-feedback-category">{review.trading_category}</p>}
        </div>
      </div>
    </article>
  );
}

function FeedbackForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ displayName: '', email: '', tradingCategory: '', message: '', website: '' });
  const [rating, setRating] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [serverError, setServerError] = useState('');
  const [openedAt] = useState(() => Date.now());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;
    setServerError('');
    // Honeypot / too-fast submissions are silently treated as sent.
    if (form.website) { setStatus('sent'); return; }
    if (Date.now() - openedAt < 2500) { setServerError('Please review your feedback, then submit again.'); return; }
    const parsed = feedbackSchema.safeParse({ ...form, rating });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach(i => { next[String(i.path[0])] = i.message; });
      setErrors(next);
      return;
    }
    setErrors({});
    setStatus('sending');
    try {
    const { data, error } = await supabase.rpc('submit_trader_feedback', {
      p_display_name: parsed.data.displayName,
      p_email: parsed.data.email,
      p_trading_category: parsed.data.tradingCategory || null,
      p_rating: parsed.data.rating,
      p_message: parsed.data.message,
    } as never);
    const result = data as { ok?: boolean; error?: string } | null;
    if (error || !result?.ok) {
      setStatus('idle');
      setServerError(feedbackErrorMessages[result?.error ?? ''] ?? 'Something went wrong. Please try again.');
      return;
    }
    setStatus('sent');
    } catch { setStatus('idle'); setServerError('Your feedback could not be sent. Please try again.'); }
  };

  if (status === 'sent') {
    return (
      <div className="py-6 text-center">
        <p className="text-lg font-medium">Thank you for your feedback.</p>
        <p className="text-sm text-muted-foreground mt-2">It will be reviewed before anything is shown publicly.</p>
        <Button className="mt-6 home-primary" onClick={onDone}>Close</Button>
      </div>
    );
  }

  const field = (key: 'displayName' | 'email' | 'tradingCategory', label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`fb-${key}`}>{label}</Label>
      <Input id={`fb-${key}`} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} aria-invalid={!!errors[key]} {...props} />
      {errors[key] && <p className="text-xs text-muted-foreground">{errors[key]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {field('displayName', 'First name or display name', { maxLength: 60, autoComplete: 'given-name' })}
      {field('email', 'Email (never shown publicly)', { type: 'email', maxLength: 255, autoComplete: 'email' })}
      {field('tradingCategory', 'Trading category (optional, e.g. Forex day trader)', { maxLength: 60 })}
      <div className="space-y-1.5">
        <Label>Rating (optional)</Label>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(rating === n ? null : n)} className="p-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
              <Star className={`h-5 w-5 ${rating !== null && n <= rating ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fb-message">Your feedback</Label>
        <Textarea id="fb-message" rows={5} maxLength={1000} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} aria-invalid={!!errors.message} />
        <div className="flex justify-between text-xs text-muted-foreground"><span>{errors.message}</span><span>{form.message.length}/1000</span></div>
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
      {serverError && <p className="text-sm text-primary" role="alert">{serverError}</p>}
      <Button type="submit" className="w-full home-primary" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Submit feedback'}</Button>
      <p className="text-xs text-muted-foreground">Feedback is reviewed by our team and only published after approval.</p>
    </form>
  );
}

export default function HomepageTraderFeedback() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [open, setOpen] = useState(false);
  const { isDemo, displayed } = selectFeedbackReviews(reviews);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true, inFlight = false;
    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const { data, error } = await supabase.rpc('get_approved_trader_feedback');
        if (error) throw error;
        const parsed = approvedFeedbackSchema.safeParse(data);
        if (!parsed.success) throw new Error('Invalid feedback response');
        if (active) { setReviews(parsed.data as Review[]); setLoadError(false); }
      } catch { if (active) setLoadError(true); }
      finally { inFlight = false; if (active) setLoading(false); }
    };
    void load();
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [retry]);

  return (
    <section className="home-section home-container home-feedback-section" id="trader-feedback">
      <div className="home-section-heading">
        <div><p className="home-eyebrow">{isDemo ? 'SAMPLE TESTIMONIALS' : 'FROM OUR TRADERS'}</p><h2>Trader<br />feedback.</h2></div>
        <Button variant="outline" className="home-secondary" onClick={() => setOpen(true)}>Share Your Feedback</Button>
      </div>
      {loading && <p role="status">Loading approved feedback…</p>}
      {loadError && <div role="alert" className="home-feedback-demo-notice">We couldn’t load the latest reviews. Cards below are {isDemo ? 'fictional examples, not customer reviews' : 'previously loaded approved reviews'}. <Button variant="outline" onClick={() => { setLoading(true); setRetry(value => value + 1); }}>Try again</Button></div>}
      {!loading && isDemo && <p className="home-feedback-demo-notice">Sample testimonials — fictional examples, not real customer reviews</p>}
      {!loading && <div className="home-feedback-masonry">
        {displayed.map((review, index) => <ReviewCard key={review.id} review={review} index={index} demo={isDemo} />)}
      </div>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Share your feedback</DialogTitle>
            <DialogDescription>Your honest experience helps other traders and helps us improve.</DialogDescription>
          </DialogHeader>
          {open && <FeedbackForm onDone={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
