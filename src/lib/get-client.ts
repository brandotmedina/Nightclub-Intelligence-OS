import { supabaseAdmin } from "@/lib/supabase-admin";

export type ClientRow = {
  id: string;
  slug: string;
  settings: Record<string, unknown> | null;
  [key: string]: unknown;
};

export async function getClientBySlug(slug: string): Promise<ClientRow | null> {
  const { data } = await supabaseAdmin
    .from("clients")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as ClientRow) ?? null;
}
