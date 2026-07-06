import { supabase } from "@/integrations/supabase/client";
import type { EventProvider } from "./index";

export const fmpProvider: EventProvider = {
  id: "fmp",
  label: "Financial Modeling Prep",
  async fetchEvents(range) {
    const from = range.from.toISOString().slice(0, 10);
    const to = range.to.toISOString().slice(0, 10);
    await supabase.functions.invoke("sync-economic-events", { body: { from, to } });
    return [];
  },
};
