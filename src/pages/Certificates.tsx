import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Award, BadgeDollarSign, Landmark, Trophy, Upload, Trash2, FileText, Loader2, X, Maximize2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

interface Certificate {
  id: string;
  prop_firm: string;
  account_size: number | null;
  cert_date: string;
  type: "eval_passed" | "funded" | "payout";
  amount: number | null;
  image_url: string | null;
  notes: string | null;
  created_at: string;
}

const PROP_FIRMS = ["Apex Trader Funding", "Alpha Futures", "Topstep", "Tradeify", "FundedX", "Lucid Trading", "FTMO", "The5ers"];

const TYPE_LABELS: Record<Certificate["type"], string> = {
  eval_passed: "Eval passed",
  funded: "Funded",
  payout: "Payout",
};

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

export default function Certificates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firm, setFirm] = useState("");
  const [customFirm, setCustomFirm] = useState("");
  const [size, setSize] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [type, setType] = useState<Certificate["type"]>("eval_passed");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("certificates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (error) {
      toast({ title: "Could not load certificates", variant: "destructive" });
    } else {
      const rows = (data || []) as Certificate[];
      setCerts(rows);
      const paths = rows.map((r) => r.image_url).filter(Boolean) as string[];
      setUrls({});
      if (paths.length) {
        const { data: signed } = await supabase.storage.from("certificates").createSignedUrls(paths, 3600);
        const map: Record<string, string> = {};
        signed?.forEach((s) => { if (s.path && s.signedUrl) map[s.path] = s.signedUrl; });
        setUrls(map);
      }
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const refreshFiles = async () => {
      const paths = certs.flatMap(c => c.image_url ? [c.image_url] : []);
      if (!paths.length) return;
      const { data } = await supabase.storage.from('certificates').createSignedUrls(paths, 3600);
      const next: Record<string, string> = {};
      data?.forEach(item => { if (item.path && item.signedUrl) next[item.path] = item.signedUrl; });
      setUrls(next);
    };
    const timer = window.setInterval(() => void refreshFiles(), 50 * 60 * 1000);
    window.addEventListener('focus', refreshFiles);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refreshFiles); };
  }, [certs]);

  const stats = useMemo(() => {
    const passed = certs.filter((c) => c.type === "eval_passed" || c.type === "funded");
    const payouts = certs.filter((c) => c.type === "payout");
    return {
      passed: passed.length,
      capital: passed.reduce((s, c) => s + (c.account_size || 0), 0),
      payouts: payouts.length,
      paidOut: payouts.reduce((s, c) => s + (c.amount || 0), 0),
    };
  }, [certs]);

  const pickFile = (f: File | null) => {
    if (!f) return;
    const ok = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"].includes(f.type);
    if (!ok || f.size > 10 * 1024 * 1024) {
      toast({ title: "File not accepted", description: "Use a PNG, JPG, WebP, GIF or PDF under 10MB.", variant: "destructive" });
      return;
    }
    setFile(f);
  };

  const resetForm = () => {
    setFirm(""); setCustomFirm(""); setSize(""); setAmount("");
    setDate(new Date().toISOString().split("T")[0]); setType("eval_passed"); setFile(null);
  };

  const handleAdd = async () => {
    const firmName = (firm === "__custom" ? customFirm : firm).trim();
    if (!user || !firmName) {
      toast({ title: "Pick or type a prop firm", variant: "destructive" });
      return;
    }
    setSaving(true);
    let imagePath: string | null = null;
    if (file) {
      const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("certificates").upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) {
        toast({ title: "File not uploaded", description: "Please try again.", variant: "destructive" });
        setSaving(false);
        return;
      }
      imagePath = path;
    }
    const { data: inserted, error } = await supabase.from("certificates").insert({
      user_id: user.id,
      prop_firm: firmName,
      account_size: size ? Number(size) : null,
      cert_date: date,
      type,
      amount: amount ? Number(amount) : null,
      image_url: imagePath,
    }).select("*").single();
    setSaving(false);
    if (error || !inserted) {
      toast({ title: "Could not save certificate", variant: "destructive" });
    } else {
      const row = inserted as Certificate;
      setCerts((prev) => [row, ...prev.filter((c) => c.id !== row.id)]);
      if (row.image_url) {
        const { data: s } = await supabase.storage.from("certificates").createSignedUrl(row.image_url, 3600);
        if (s?.signedUrl) setUrls((u) => ({ ...u, [row.image_url!]: s.signedUrl }));
      }
      toast({ title: "Certificate added!" });
      resetForm();
    }
  };

  const handleDelete = async (cert: Certificate) => {
    const { error } = await supabase.from("certificates").delete().eq("id", cert.id).eq("user_id", user!.id);
    if (error) {
      toast({ title: "Could not delete", variant: "destructive" });
      return;
    }
    if (cert.image_url) await supabase.storage.from("certificates").remove([cert.image_url]);
    setCerts((prev) => prev.filter((c) => c.id !== cert.id));
    toast({ title: "Certificate removed" });
  };

  const [view, setView] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);
  const go = (d: number) => { if (!certs.length) return; setZoom(false); setView((v) => v === null ? v : (v + d + certs.length) % certs.length); };
  const cur = view !== null ? certs[view] : null;
  const curUrl = cur?.image_url ? urls[cur.image_url] : null;
  const curPdf = !!cur?.image_url?.toLowerCase().endsWith(".pdf");

  const statCards = [
    { label: "Accounts passed", value: String(stats.passed), icon: Trophy },
    { label: "Funded capital", value: fmtMoney(stats.capital), icon: Landmark },
    { label: "Payouts", value: String(stats.payouts), icon: BadgeDollarSign },
    { label: "Paid out", value: fmtMoney(stats.paidOut), icon: Award },
  ];

  return (
    <div className="space-y-6 content-crossfade">
      <PageHeader title="Certificates" description="Your prop firm wall — evaluations passed, funded accounts and payouts." />

      <Card className="feature-reveal" style={{ animationDelay: "140ms" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add Certificate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Prop firm — pick below or type your own</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {PROP_FIRMS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFirm(f)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors duration-300 ${
                    firm === f ? "bg-primary/15 text-primary border-primary/40" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                  }`}
                >
                  {f}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFirm("__custom")}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors duration-300 ${
                  firm === "__custom" ? "bg-primary/15 text-primary border-primary/40" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                }`}
              >
                Other
              </button>
            </div>
            {firm === "__custom" && (
              <Input className="mt-2 max-w-xs" placeholder="Type the firm name" value={customFirm} onChange={(e) => setCustomFirm(e.target.value)} />
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Account size / amount ($)</Label>
              <Input type="number" min="0" placeholder="50000 or 50k" value={size} onChange={(e) => setSize(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Certificate["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="eval_passed">Eval passed</SelectItem>
                  <SelectItem value="funded">Funded</SelectItem>
                  <SelectItem value="payout">Payout</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {type === "payout" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Payout amount ($)</Label>
                <Input type="number" min="0" placeholder="1500" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0] || null); }}
              className={`flex-1 min-h-[88px] rounded-lg border border-dashed flex flex-col items-center justify-center gap-1.5 text-xs transition-colors duration-300 ${
                dragOver ? "border-primary/60 bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {file ? (
                <span className="flex items-center gap-2 text-foreground">
                  <FileText className="h-4 w-4 text-primary" /> {file.name}
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); setFile(null); }} />
                </span>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Drag &amp; drop certificate (image or PDF), or tap to browse</span>
                </>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] || null)} />
            <Button onClick={handleAdd} disabled={saving} className="sm:self-end">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add to Wall
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s, i) => (
          <Card key={s.label} className="tn-lift feature-reveal" style={{ animationDelay: `${i * 70}ms` }}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="text-xl font-semibold text-foreground truncate">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-44 animate-pulse bg-card/50" />
          ))}
        </div>
      ) : certs.length === 0 ? (
        <Card className="feature-reveal" style={{ animationDelay: "210ms" }}>
          <CardContent className="py-14 flex flex-col items-center gap-3 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <p className="font-medium text-foreground">No certificates yet</p>
            <p className="text-sm text-muted-foreground max-w-sm">Add your first passed evaluation, funded account or payout above and start building your wall.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {certs.map((c, i) => {
            const url = c.image_url ? urls[c.image_url] : null;
            const isPdf = c.image_url?.toLowerCase().endsWith(".pdf");
            return (
              <Card key={c.id} role="button" tabIndex={0} aria-label={`View ${c.prop_firm} certificate`} onClick={() => { setZoom(false); setView(i); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setZoom(false); setView(i); } }} className="overflow-hidden tn-lift trade-gallery group cursor-pointer transition-colors duration-200 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" style={{ animationDelay: `${Math.min(i, 6) * 70}ms` }}>
                <div className="relative aspect-[4/3] bg-muted/30 flex items-center justify-center">
                  {url && !isPdf ? (
                    <img src={url} alt={`${c.prop_firm} certificate`} className="absolute inset-0 w-full h-full object-contain p-1" loading="lazy" />
                  ) : url && isPdf ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                      <FileText className="h-8 w-8" />
                      <span className="text-xs">PDF certificate</span>
                    </div>
                  ) : (
                    <Award className="h-8 w-8 text-muted-foreground/40" />
                  )}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide bg-background/80 text-primary border border-primary/30 backdrop-blur-sm">
                    {TYPE_LABELS[c.type]}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(c); }} onKeyDown={(e) => e.stopPropagation()}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 border border-border flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-300 text-muted-foreground hover:text-destructive"
                    aria-label="Delete certificate"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-background/80 p-1 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100"><Maximize2 className="h-3.5 w-3.5" /></span>
                </div>
                <CardContent className="p-3">
                  <p className="text-sm font-medium text-foreground truncate">{c.prop_firm}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.type === "payout" && c.amount ? fmtMoney(c.amount) : c.account_size ? fmtMoney(c.account_size) : "—"}
                    {" · "}
                    {new Date(c.cert_date + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={view !== null} onOpenChange={(o) => { if (!o) setView(null); }}>
        <DialogContent className="flex h-[94vh] w-[96vw] max-w-[96vw] flex-col gap-3 bg-background/95 p-3 sm:p-4 sm:rounded-md" onKeyDown={(e) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); }}>
          <DialogTitle className="sr-only">{cur ? `${cur.prop_firm} certificate` : "Certificate"}</DialogTitle>
          {cur && (<>
            <div className="flex items-center gap-2 pr-8">
              <span className="font-mono text-xs text-muted-foreground">{(view ?? 0) + 1} / {certs.length}</span>
              {curUrl && !curPdf && (
                <Button size="icon" variant="outline" className="ml-auto h-8 w-8" onClick={() => setZoom((z) => !z)} aria-label={zoom ? "Zoom out" : "Zoom in"}>
                  {zoom ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                </Button>
              )}
              {curUrl && <Button size="sm" variant="outline" className={`h-8 ${curPdf ? "ml-auto" : ""}`} asChild><a href={curUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1.5" />Open certificate</a></Button>}
            </div>
            <div className="relative min-h-0 flex-1 rounded-md border border-border bg-background">
              <div className={`h-full w-full ${zoom ? "overflow-auto" : "flex items-center justify-center overflow-hidden"}`}>
                {!curUrl ? <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground"><Award className="h-10 w-10" /><p className="text-sm">No file uploaded for this certificate</p></div>
                  : curPdf ? <iframe src={curUrl} title={`${cur.prop_firm} certificate PDF`} className="h-full w-full rounded-md" />
                  : <img src={curUrl} alt={`${cur.prop_firm} certificate`} onClick={() => setZoom((z) => !z)} className={zoom ? "max-w-none cursor-zoom-out" : "h-full w-full object-contain cursor-zoom-in"} style={zoom ? { width: "200%" } : undefined} />}
              </div>
              {certs.length > 1 && (<>
                <Button size="icon" variant="outline" className="absolute left-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-background/80" onClick={() => go(-1)} aria-label="Previous certificate"><ChevronLeft className="h-5 w-5" /></Button>
                <Button size="icon" variant="outline" className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-background/80" onClick={() => go(1)} aria-label="Next certificate"><ChevronRight className="h-5 w-5" /></Button>
              </>)}
            </div>
            <dl className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4">
              {([["Prop firm", cur.prop_firm], ["Account size / amount", cur.type === "payout" && cur.amount ? fmtMoney(cur.amount) : cur.account_size ? fmtMoney(cur.account_size) : "—"], ["Type", TYPE_LABELS[cur.type]], ["Date", new Date(cur.cert_date + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })]] as [string, string][]).map(([k, v]) => (
                <div key={k} className="min-w-0"><dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</dt><dd className="truncate text-sm font-medium text-foreground">{v}</dd></div>
              ))}
            </dl>
          </>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
