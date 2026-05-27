// AI Replay Review — uses Lovable AI Gateway to score a replay session
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const sessionId = body?.sessionId;
    if (!sessionId || typeof sessionId !== 'string') {
      return new Response(JSON.stringify({ error: 'sessionId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: session, error: sErr } = await supabase
      .from('replay_sessions').select('*').eq('id', sessionId).eq('user_id', user.id).maybeSingle();
    if (sErr || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const executions = Array.isArray(session.executions) ? session.executions : [];
    const mistakes = Array.isArray(session.mistakes) ? session.mistakes : [];

    const userPrompt = `Review this trade replay. Respond ONLY with JSON (no markdown):
{"verdict":"Good trade"|"Average trade"|"Poor trade","discipline_score":0-100,"execution_score":0-100,"what_went_well":["string"],"what_to_improve":["string"],"ai_suggestion":"string","setup_quality":0-100,"risk_management":0-100,"patience":0-100}
Trade: ${session.pair} ${(session.outcome ?? '').toUpperCase()} P&L:$${session.result ?? 0} R:R:${session.rr ?? 'N/A'} Entry:${session.entry_price ?? 'N/A'} SL:${session.stop_loss ?? 'N/A'} TP:${session.take_profit ?? 'N/A'} Session:${session.session_name ?? 'N/A'} Setup:${session.setup ?? 'N/A'} Mistakes:[${mistakes.join(',')}] WentWell:${session.what_went_well ?? 'N/A'} Executions:${executions.length}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a strict trading coach. Output only raw JSON, no markdown.' },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, try again later' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI gateway error', detail: txt }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiRes.json();
    const raw = aiData?.choices?.[0]?.message?.content ?? '{}';
    let review: any = {};
    try {
      review = JSON.parse(String(raw).replace(/```json|```/g, '').trim());
    } catch {
      review = { verdict: 'Average trade', ai_suggestion: String(raw).slice(0, 500) };
    }

    await supabase
      .from('replay_sessions')
      .update({ ai_review: review, updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    return new Response(JSON.stringify({ review }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
