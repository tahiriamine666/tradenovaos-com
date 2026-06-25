import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const FALLBACK = {
  readiness_score: 65,
  discipline_score: 70,
  risk_score: 60,
  warnings: ['Could not generate AI analysis'],
  suggestions: ['Ensure risk management is set', 'Complete the checklist before trading'],
  verdict: 'Proceed with caution',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Auth check
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

    const { data: planInfo } = await supabase.rpc('get_user_plan_info');
    const info = planInfo as any;
    if (!info?.is_pro && !info?.is_elite) {
      return new Response(JSON.stringify({ error: 'Upgrade to Pro or Elite to use Trade Plan AI Analysis.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }



    const { plan } = await req.json();
    if (!plan) {
      return new Response(JSON.stringify({ error: 'Missing plan' }), {
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

    const doneCount = (plan.checklist ?? []).filter((i: any) => i.done).length;
    const totalCount = (plan.checklist ?? []).length;

    const userPrompt = `You are a professional trading coach reviewing a trader's daily plan. Analyze this plan and respond with ONLY a JSON object (no markdown, no backticks):

{
  "readiness_score": <0-100 integer>,
  "discipline_score": <0-100 integer>,
  "risk_score": <0-100 integer>,
  "warnings": ["warning1", "warning2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "verdict": "Ready to trade" | "Proceed with caution" | "Do not trade today"
}

Trader's Plan:
- Bias: ${plan.market_bias}
- Focus: ${plan.focus || 'not set'}
- Session: ${plan.session || 'not specified'}
- Main Setup: ${plan.setups_to_trade?.[0] || 'not set'}
- Max Loss: ${plan.max_daily_loss ? '$' + plan.max_daily_loss : 'not set'}
- Risk/Trade: ${plan.max_risk_per_trade ? plan.max_risk_per_trade + '%' : 'not set'}
- Emotion: ${plan.emotion}
- Sleep: ${plan.sleep_quality}
- Confidence: ${plan.confidence}%
- Checklist done: ${doneCount}/${totalCount}
- News impact: ${plan.news_impact}
- Avoid news: ${plan.avoid_before_news}`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Respond with ONLY a valid JSON object. No markdown, no code fences.' },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (res.status === 429 || res.status === 402) {
      return new Response(JSON.stringify({ ...FALLBACK, warnings: ['AI rate limit reached, try again later'] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(clean);
    } catch {
      parsed = FALLBACK;
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('trade-plan-analysis error', e);
    return new Response(JSON.stringify(FALLBACK), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
