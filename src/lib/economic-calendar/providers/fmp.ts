import { supabase } from "@/integrations/supabase/client";
import type { EventProvider } from "./index";

export const fmpProvider: EventProvider = {
  id: "fmp",
  label: "Financial Modeling Prep",
  async fetchEvents(range) {
    const from = range.from.toISOString().slice(0, 10);
    const to = range.to.toISOString().slice(0, 10);
    // Only signed-in users may trigger a sync; skip silently otherwise.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return [];
    try {
      const { error } = await supabase.functions.invoke("sync-economic-events", {
        body: { from, to },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) console.warn("[economic-calendar] sync skipped:", error.message);
    } catch (e) {
      console.warn("[economic-calendar] sync failed:", e);
    }
    return [];
  },
};
