import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useBookmarks() {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!user) { setIds(new Set()); return; }
    const { data } = await supabase.from("event_bookmarks" as never).select("event_id");
    setIds(new Set(((data ?? []) as Array<{ event_id: string }>).map((r) => r.event_id)));
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = useCallback(async (eventId: string) => {
    if (!user) return;
    if (ids.has(eventId)) {
      await supabase.from("event_bookmarks" as never).delete().eq("event_id", eventId);
    } else {
      await supabase.from("event_bookmarks" as never).insert({ user_id: user.id, event_id: eventId } as never);
    }
    refresh();
  }, [ids, user, refresh]);

  return { ids, toggle };
}
