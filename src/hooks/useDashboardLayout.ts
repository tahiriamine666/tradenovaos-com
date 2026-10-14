import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_LAYOUT, normalizeLayout, type DashboardLayout } from "@/lib/dashboard/layout";

export function useDashboardLayout(userId?: string) {
  const client = useQueryClient();
  const key = ["dashboard-layout", userId];
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return DEFAULT_LAYOUT;
      const { data, error } = await supabase.from("workspace_layouts")
        .select("layout").eq("user_id", userId).eq("page", "dashboard").maybeSingle();
      if (error) throw error;
      return normalizeLayout(data?.layout);
    },
  });

  async function save(layout: DashboardLayout) {
    if (!userId) throw new Error("Sign in to save your layout.");
    const normalized = normalizeLayout(layout);
    const { error } = await supabase.from("workspace_layouts").upsert({
      user_id: userId, page: "dashboard", layout: JSON.parse(JSON.stringify(normalized)),
    }, { onConflict: "user_id,page" });
    if (error) throw error;
    client.setQueryData(key, normalized);
  }

  return { layout: query.data ?? DEFAULT_LAYOUT, loading: query.isPending && Boolean(userId), error: query.isError, reload: query.refetch, save };
}