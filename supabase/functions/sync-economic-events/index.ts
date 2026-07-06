import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const FMP_URL = 'https://financialmodelingprep.com/stable/economic-calendar';

const COUNTRY_TO_ISO2: Record<string, string> = {
  'United States': 'US', 'US': 'US', 'USA': 'US',
  'Euro Area': 'EU', 'European Union': 'EU', 'Germany': 'DE', 'France': 'FR', 'Italy': 'IT', 'Spain': 'ES',
  'United Kingdom': 'GB', 'UK': 'GB', 'Britain': 'GB',
  'Japan': 'JP', 'China': 'CN', 'Canada': 'CA', 'Australia': 'AU', 'New Zealand': 'NZ',
  'Switzerland': 'CH', 'Sweden': 'SE', 'Norway': 'NO', 'Denmark': 'DK',
  'Brazil': 'BR', 'Mexico': 'MX', 'India': 'IN', 'South Korea': 'KR', 'Singapore': 'SG',
  'Hong Kong': 'HK', 'South Africa': 'ZA', 'Russia': 'RU', 'Turkey': 'TR',
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
  if (s === 'high') return 'high';
  if (s === 'medium') return 'medium';
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const FMP_API_KEY = Deno.env.get('FMP_API_KEY');
    if (!FMP_API_KEY) {
      return new Response(JSON.stringify({ error: 'FMP_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: { from?: string; to?: string } = {};
    try { body = await req.json(); } catch { /* GET or empty */ }

    const today = new Date();
    const inWeek = new Date(today.getTime() + 7 * 24 * 3600 * 1000);
    const from = body.from ?? today.toISOString().slice(0, 10);
    const to = body.to ?? inWeek.toISOString().slice(0, 10);

    const url = `${FMP_URL}?from=${from}&to=${to}&apikey=${FMP_API_KEY}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: 'FMP fetch failed', status: resp.status, body: text.slice(0, 500) }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const rows = await resp.json() as Array<Record<string, unknown>>;
    if (!Array.isArray(rows)) {
      return new Response(JSON.stringify({ error: 'Unexpected FMP response', sample: rows }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalized = rows.map((r) => {
      const dateStr = String(r.date ?? '');
      const eventName = String(r.event ?? '');
      const countryName = String(r.country ?? '');
      const currency = String(r.currency ?? '').toUpperCase() || null;
      const country = COUNTRY_TO_ISO2[countryName] ?? (countryName.length === 2 ? countryName.toUpperCase() : (currency ? currency.slice(0, 2) : 'US'));
      const impact = mapImpact(r.impact);
      const eventTime = dateStr.includes('T') ? new Date(dateStr).toISOString() : new Date(dateStr.replace(' ', 'T') + 'Z').toISOString();
      return {
        external_id: stableId(dateStr, country, eventName),
        source_provider: 'fmp',
        event_time: eventTime,
        country,
        currency: currency ?? country,
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
        affected_symbols: currency ? (SYMBOLS_BY_CURRENCY[currency] ?? null) : null,
      };
    }).filter((r) => r.title && r.event_time);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let upserted = 0;
    const CHUNK = 500;
    for (let i = 0; i < normalized.length; i += CHUNK) {
      const chunk = normalized.slice(i, i + CHUNK);
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

    return new Response(JSON.stringify({ ok: true, total: normalized.length, upserted, from, to }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Unhandled', detail: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
