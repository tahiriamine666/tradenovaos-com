import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const FALLBACK = {
  verdict: 'Average trade',
  what_went_well: null,
  what_went_wrong: null,
  rule_broken: null,
  improvement: 'Could not generate AI review. Try again later.',
  discipline_score: 70,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { trade } = await req.json();
    if (!trade) {
      return new Response(JSON.stringify({ error: 'Missing trade' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify(FALLBACK), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userPrompt = `Review this trade and respond with ONLY a JSON object (no markdown, no code fences):

{
  "verdict": "Good trade" | "Average trade" | "Poor trade",
  "what_went_well": "string or null",
  "what_went_wrong": "string or null",
  "rule_broken": "string or null",
  "improvement": "string",
  "discipline_score": 0-100
}

Trade: ${trade.pair} ${String(trade.side ?? '').toUpperCase()}, ${String(trade.outcome ?? '').toUpperCase()}, P&L: $${trade.result}, R:R: ${trade.rr ?? 'N/A'}, Setup: ${trade.setup ?? 'none'}, Emotion: ${trade.emotion ?? 'N/A'}, Mistakes: ${(trade.mistakes ?? []).join(', ') || 'none'}, Notes: ${trade.notes || 'none'}`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Respond with ONLY a valid JSON object. No markdown, no code fences.' },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (res.status === 429 || res.status === 402) {
      return new Response(
        JSON.stringify({ ...FALLBACK, improvement: 'AI rate limit reached. Try again later.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    let parsed: any;
    try { parsed = JSON.parse(clean); } catch { parsed = FALLBACK; }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('trade-review error', e);
    return new Response(JSON.stringify(FALLBACK), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
