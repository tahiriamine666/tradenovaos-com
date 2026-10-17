import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { invitationMessages, invitationRequest, type TraderInvitation } from '@/lib/invitations';

const date = (value: string | null) => value ? new Date(value).toLocaleString() : '—';
const selectClass = 'h-10 rounded-md border border-input bg-background px-3 text-sm';
export default function TraderInvitations() {
  const [rows, setRows] = useState<TraderInvitation[]>([]);
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<TraderInvitation | null>(null);
  const [revoke, setRevoke] = useState<TraderInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [duration, setDuration] = useState('30');
  const load = useCallback(async (query = '') => {
    setLoading(true); setError('');
    try { const result = await invitationRequest({ action: 'list', search: query }); setRows(result.invitations ?? []); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load invitations.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const action = async (body: Record<string, unknown>) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await invitationRequest(body);
      setNotice(result.warning ? invitationMessages[result.warning] ?? 'Invitation saved, but delivery could not be confirmed. Review the status before resending.' : result.sent ? 'Invitation sent.' : 'Invitation updated.');
      setOpen(false); setRevoke(null); await load(search);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update invitation.'); }
    finally { setBusy(false); }
  };
  const filtered = rows.filter(row => filter === 'all' || row.status === filter);
  return <section className="space-y-4 rounded-xl border border-border/60 bg-card p-4" aria-label="Trader invitations">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Trader invitations</h2><p className="text-sm text-muted-foreground">Complimentary access, separate from paid subscriptions.</p></div><Button onClick={() => setOpen(true)}>Invite Trader</Button></div>
    <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); void load(search); }}>
      <Input className="w-full sm:w-64" aria-label="Search invited email" placeholder="Search invited email" value={search} onChange={event => setSearch(event.target.value)} />
      <select className={selectClass} aria-label="Invitation status" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All statuses</option>{['pending','sent','accepted','expired','revoked'].map(status => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select>
      <Button variant="outline" disabled={loading}>Search / Refresh</Button>
    </form>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
    {loading ? <p role="status">Loading invitations…</p> : filtered.length === 0 ? <p className="py-6 text-sm text-muted-foreground">No matching invitations.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Latest 500 invitations matching the email search</caption><thead><tr>{['Email / Plan','Reason','Created','Link expires','Access expires','Status','Actions'].map(label => <th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{filtered.map(row => <tr className="border-t border-border" key={row.id}>
      <td className="p-2"><span className="break-all">{row.email}</span><br /><span className="uppercase text-primary">{row.plan}</span></td><td className="p-2">{row.reason}</td><td className="p-2">{date(row.created_at)}</td><td className="p-2">{date(row.expires_at)}</td><td className="p-2">{row.access_expires_at ? date(row.access_expires_at) : `${row.duration_days} days after acceptance`}</td><td className="p-2 capitalize">{row.status}{row.delivery_error && <span className="block text-destructive">Delivery unconfirmed</span>}</td><td className="p-2"><div className="flex flex-wrap gap-1"><Button size="sm" variant="ghost" onClick={() => setDetails(row)}>Details</Button>{['pending','sent'].includes(row.status) && <Button size="sm" variant="outline" disabled={busy} onClick={() => void action({ action: 'resend', id: row.id })}>Resend</Button>}{row.status !== 'revoked' && <Button size="sm" variant="outline" disabled={busy} onClick={() => setRevoke(row)}>Revoke</Button>}</div></td>
    </tr>)}</tbody></table></div>}
    <p className="text-xs text-muted-foreground">Showing up to 500 results. Narrow the email search to find older invitations. Links expire after seven days; resending invalidates the previous link.</p>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Invite Trader</DialogTitle><DialogDescription>Grant complimentary access after verified acceptance. Existing paid access is preserved.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void action({ action: 'create', email: form.get('email'), plan: form.get('plan'), reason: form.get('reason'), notes: form.get('notes'), duration_days: duration === 'custom' ? null : Number(duration), access_expires_at: duration === 'custom' ? new Date(String(form.get('expires'))).toISOString() : null }); }}>
        <label className="block text-sm">Trader email<Input name="email" type="email" required maxLength={254} autoComplete="off" /></label>
        <label className="block text-sm">Plan<select name="plan" className={`${selectClass} mt-1 w-full`}><option value="pro">Pro</option><option value="elite">Elite</option></select></label>
        <label className="block text-sm">Access duration<select className={`${selectClass} mt-1 w-full`} value={duration} onChange={event => setDuration(event.target.value)}>{['7','30','90','365'].map(days => <option key={days} value={days}>{days === '365' ? '1 year (365 days)' : `${days} days`} after acceptance</option>)}<option value="custom">Custom expiration</option></select></label>
        {duration === 'custom' && <label className="block text-sm">Expiration (your local time)<Input type="datetime-local" name="expires" required /></label>}
        <label className="block text-sm">Reason<select name="reason" className={`${selectClass} mt-1 w-full`}>{['Affiliate','Collaboration','Partnership','Giveaway','Other'].map(reason => <option key={reason}>{reason}</option>)}</select></label>
        <label className="block text-sm">Internal notes (optional)<Textarea name="notes" maxLength={2000} /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" disabled={busy}>{busy ? 'Sending…' : 'Send Invitation'}</Button>
      </form>
    </DialogContent></Dialog>
    <Dialog open={!!details} onOpenChange={value => { if (!value) setDetails(null); }}><DialogContent><DialogHeader><DialogTitle>Invitation details</DialogTitle><DialogDescription>{details?.email}</DialogDescription></DialogHeader>{details && <dl className="space-y-3 text-sm"><dt>Plan / status</dt><dd>{details.plan} / {details.status}</dd><dt>Reason</dt><dd>{details.reason}</dd><dt>Accepted</dt><dd>{date(details.accepted_at)}</dd><dt>Internal notes</dt><dd className="whitespace-pre-wrap break-words">{details.notes || 'No notes.'}</dd><dt>Delivery</dt><dd>{details.delivery_error || 'No delivery error recorded.'}</dd></dl>}</DialogContent></Dialog>
    <Dialog open={!!revoke} onOpenChange={value => { if (!value && !busy) setRevoke(null); }}><DialogContent><DialogHeader><DialogTitle>Revoke invitation?</DialogTitle><DialogDescription>This invalidates the link and removes only access still owned by this invitation. Paid subscriptions and later independent admin grants are preserved.</DialogDescription></DialogHeader><Button variant="destructive" disabled={busy} onClick={() => revoke && void action({ action: 'revoke', id: revoke.id })}>Confirm revocation</Button>{error && <p role="alert">{error}</p>}</DialogContent></Dialog>
  </section>;
}
