import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const FMP_URL = 'https://financialmodelingprep.com/stable/economic-calendar';
// Free public JSON feed maintained by FairEconomy (ForexFactory mirror).
const FF_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

const COUNTRY_TO_ISO2: Record<string, string> = {
  'United States': 'US', US: 'US', USA: 'US',
  'Euro Area': 'EU', 'European Union': 'EU', Germany: 'DE', France: 'FR', Italy: 'IT', Spain: 'ES',
  'United Kingdom': 'GB', UK: 'GB', Britain: 'GB',
  Japan: 'JP', China: 'CN', Canada: 'CA', Australia: 'AU', 'New Zealand': 'NZ',
  Switzerland: 'CH', Sweden: 'SE', Norway: 'NO', Denmark: 'DK',
  Brazil: 'BR', Mexico: 'MX', India: 'IN', 'South Korea': 'KR', Singapore: 'SG',
  'Hong Kong': 'HK', 'South Africa': 'ZA', Russia: 'RU', Turkey: 'TR',
};

const CURRENCY_TO_ISO2: Record<string, string> = {
  USD: 'US', EUR: 'EU', GBP: 'GB', JPY: 'JP', CHF: 'CH',
  CAD: 'CA', AUD: 'AU', NZD: 'NZ', CNY: 'CN', HKD: 'HK',
  SGD: 'SG', SEK: 'SE', NOK: 'NO', DKK: 'DK', INR: 'IN',
  BRL: 'BR', MXN: 'MX', KRW: 'KR', ZAR: 'ZA', RUB: 'RU', TRY: 'TR',
};

const SYMBOLS_BY_CURRENCY: Record<string, string[]> = {
  USD: ['EURUSD', 'XAUUSD', 'NAS100', 'US30', 'SPX500'],
  EUR: ['EURUSD', 'DAX', 'EURGBP'],
  GBP: ['GBPUSD', 'EURGBP', 'UK100'],
  JPY: ['USDJPY', 'EURJPY', 'JPN225'],
  AUD: ['AUDUSD', 'AUS200'],
  CAD: ['USDCAD'],
  CHF: ['USDCHF', 'EURCHF'],
  NZD: ['NZDUSD'],
  CNY: ['USDCNH', 'HK50'],
};

const MOVERS = ['non-farm payroll', 'nfp', 'cpi', 'fomc', 'ecb', 'boe', 'boj', 'gdp', 'ppi', 'retail sales', 'unemployment', 'interest rate'];

function categorize(name: string): string {
  const n = name.toLowerCase();
  if (/cpi|ppi|inflation|price index/.test(n)) return 'Inflation';
  if (/rate decision|interest rate|fomc|ecb|boe|boj|refi rate|cash rate/.test(n)) return 'Central Bank';
  if (/nfp|non-farm|employment|unemployment|payroll|jobless|jobs/.test(n)) return 'Employment';
  if (/gdp|growth/.test(n)) return 'GDP';
  if (/pmi|ism|manufacturing|industrial/.test(n)) return 'Manufacturing';
  if (/retail sales/.test(n)) return 'Retail';
  if (/consumer confidence|sentiment|michigan/.test(n)) return 'Consumer Confidence';
  if (/housing|home sales|building permits/.test(n)) return 'Housing';
  if (/trade balance|exports|imports/.test(n)) return 'Trade';
  return 'Other';
}

function mapImpact(v: unknown): 'low' | 'medium' | 'high' {
  const s = String(v ?? '').toLowerCase();
  if (s === 'high' || s === 'red') return 'high';
  if (s === 'medium' || s === 'orange' || s === 'yellow') return 'medium';
  return 'low';
}

function volScore(name: string, impact: 'low' | 'medium' | 'high'): number {
  const base = impact === 'high' ? 9 : impact === 'medium' ? 6 : 3;
  const n = name.toLowerCase();
  const bump = MOVERS.some((m) => n.includes(m)) ? 1 : 0;
  return Math.min(10, base + bump);
}

function stableId(date: string, country: string, event: string): string {
  return `${date}|${country}|${event}`.toLowerCase().replace(/\s+/g, '_').slice(0, 250);
}

interface NormalRow {
  external_id: string;
  source_provider: string;
  event_time: string;
  country: string;
  currency: string;
  title: string;
  category: string;
  impact: 'low' | 'medium' | 'high';
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  unit: string | null;
  source: string;
  description: string | null;
  volatility_score: number;
  affected_symbols: string[] | null;
}

async function fetchFmp(from: string, to: string, apiKey: string): Promise<{ rows: NormalRow[]; err: string | null }> {
  const url = `${FMP_URL}?from=${from}&to=${to}&apikey=${apiKey}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const body = await resp.text();
    return { rows: [], err: `FMP ${resp.status}: ${body.slice(0, 200)}` };
  }
  const data = await resp.json() as Array<Record<string, unknown>>;
  if (!Array.isArray(data)) return { rows: [], err: 'FMP unexpected shape' };
  const rows = data.map((r) => {
    const dateStr = String(r.date ?? '');
    const eventName = String(r.event ?? '');
    const countryName = String(r.country ?? '');
    const currency = String(r.currency ?? '').toUpperCase() || 'USD';
    const country = COUNTRY_TO_ISO2[countryName] ?? CURRENCY_TO_ISO2[currency] ?? (countryName.length === 2 ? countryName.toUpperCase() : 'US');
    const impact = mapImpact(r.impact);
    const eventTime = dateStr.includes('T') ? new Date(dateStr).toISOString() : new Date(dateStr.replace(' ', 'T') + 'Z').toISOString();
    return {
      external_id: stableId(dateStr, country, eventName),
      source_provider: 'fmp',
      event_time: eventTime,
      country,
      currency,
      title: eventName,
      category: categorize(eventName),
      impact,
      forecast: r.estimate != null ? String(r.estimate) : null,
      previous: r.previous != null ? String(r.previous) : null,
      actual: r.actual != null ? String(r.actual) : null,
      unit: (r.unit as string) ?? null,
      source: 'Financial Modeling Prep',
      description: null,
      volatility_score: volScore(eventName, impact),
      affected_symbols: SYMBOLS_BY_CURRENCY[currency] ?? null,
    } satisfies NormalRow;
  }).filter((r) => r.title && r.event_time);
  return { rows, err: null };
}

async function fetchForexFactory(): Promise<{ rows: NormalRow[]; err: string | null }> {
  const resp = await fetch(FF_URL, { headers: { 'user-agent': 'TradeNovaOS/1.0' } });
  if (!resp.ok) return { rows: [], err: `FF ${resp.status}` };
  const data = await resp.json() as Array<Record<string, unknown>>;
  if (!Array.isArray(data)) return { rows: [], err: 'FF unexpected shape' };
  const rows = data.map((r) => {
    const title = String(r.title ?? '');
    const currency = String(r.country ?? r.currency ?? '').toUpperCase();
    const country = CURRENCY_TO_ISO2[currency] ?? 'US';
    const impact = mapImpact(r.impact);
    const dateStr = String(r.date ?? '');
    let eventTime: string;
    try {
      eventTime = new Date(dateStr).toISOString();
    } catch {
      return null;
    }
    return {
      external_id: stableId(dateStr, country, title),
      source_provider: 'forexfactory',
      event_time: eventTime,
      country,
      currency,
      title,
      category: categorize(title),
      impact,
      forecast: r.forecast != null && r.forecast !== '' ? String(r.forecast) : null,
      previous: r.previous != null && r.previous !== '' ? String(r.previous) : null,
      actual: r.actual != null && r.actual !== '' ? String(r.actual) : null,
      unit: null,
      source: 'ForexFactory',
      description: null,
      volatility_score: volScore(title, impact),
      affected_symbols: SYMBOLS_BY_CURRENCY[currency] ?? null,
    } satisfies NormalRow;
  }).filter((r): r is NormalRow => !!r && !!r.title && !!r.event_time);
  return { rows, err: null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // --- Authentication: only signed-in users (or internal service-role callers) may trigger a sync.
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const isInternal = token.length > 0 && token === serviceKey;

    if (!isInternal) {
      if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const authClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: `Bearer ${token}` } } },
      );
      const { data: userData, error: userErr } = await authClient.auth.getUser();
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    let body: { from?: string; to?: string } = {};
    try { body = await req.json(); } catch { /* empty */ }



    const today = new Date();
    const inWeek = new Date(today.getTime() + 7 * 24 * 3600 * 1000);
    const from = body.from ?? today.toISOString().slice(0, 10);
    const to = body.to ?? inWeek.toISOString().slice(0, 10);

    // 1) Try FMP if key is present.
    const apiKey = Deno.env.get('FMP_API_KEY');
    let rows: NormalRow[] = [];
    let usedProvider = 'none';
    let fmpErr: string | null = null;

    if (apiKey) {
      const res = await fetchFmp(from, to, apiKey);
      if (res.rows.length > 0) {
        rows = res.rows;
        usedProvider = 'fmp';
      } else {
        fmpErr = res.err;
      }
    }

    // 2) Fallback to ForexFactory weekly feed (free, no key).
    if (rows.length === 0) {
      const res = await fetchForexFactory();
      if (res.rows.length > 0) {
        rows = res.rows;
        usedProvider = 'forexfactory';
      } else if (!fmpErr) {
        fmpErr = res.err;
      }
    }

    if (rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, upserted: 0, provider: usedProvider, error: fmpErr }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let upserted = 0;
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error, count } = await supabase
        .from('economic_events')
        .upsert(chunk, { onConflict: 'external_id,source_provider', count: 'exact' });
      if (error) {
        return new Response(JSON.stringify({ error: 'Upsert failed', detail: error.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      upserted += count ?? chunk.length;
    }

    return new Response(JSON.stringify({ ok: true, total: rows.length, upserted, from, to, provider: usedProvider }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Unhandled', detail: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
