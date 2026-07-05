import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { EconomicEvent } from "./types";

export interface AlertRow {
  id: string;
  event_id: string;
  remind_minutes_before: number;
  notified_at: string | null;
}

export function useAlerts(events: EconomicEvent[]) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);

  const refresh = useCallback(async () => {
    if (!user) { setAlerts([]); return; }
    const { data } = await supabase
      .from("event_alerts" as never)
      .select("id,event_id,remind_minutes_before,notified_at");
    setAlerts((data ?? []) as unknown as AlertRow[]);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const setAlert = useCallback(async (eventId: string, minutes: 15 | 30 | 60) => {
    if (!user) return;
    await supabase.from("event_alerts" as never).upsert({
      user_id: user.id, event_id: eventId, remind_minutes_before: minutes,
    } as never, { onConflict: "user_id,event_id,remind_minutes_before" });
    refresh();
  }, [user, refresh]);

  const removeAlert = useCallback(async (id: string) => {
    await supabase.from("event_alerts" as never).delete().eq("id", id);
    refresh();
  }, [refresh]);

  // Poll every 60s for due alerts
  useEffect(() => {
    if (!alerts.length) return;
    const tick = () => {
      const now = Date.now();
      const byId = new Map(events.map((e) => [e.id, e]));
      for (const a of alerts) {
        if (a.notified_at) continue;
        const ev = byId.get(a.event_id);
        if (!ev) continue;
        const t = new Date(ev.event_time).getTime();
        const remindAt = t - a.remind_minutes_before * 60_000;
        if (now >= remindAt && now < t) {
          toast.info(`${ev.title} in ${a.remind_minutes_before} min`, {
            description: `${ev.currency} · ${ev.impact.toUpperCase()} impact`,
          });
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try { new Notification(ev.title, { body: `${ev.currency} • ${a.remind_minutes_before} min` }); } catch { /* noop */ }
          }
          supabase.from("event_alerts" as never).update({ notified_at: new Date().toISOString() } as never).eq("id", a.id).then(refresh);
        }
      }
    };
    tick();
    const h = setInterval(tick, 60_000);
    return () => clearInterval(h);
  }, [alerts, events, refresh]);

  return { alerts, setAlert, removeAlert };
}
