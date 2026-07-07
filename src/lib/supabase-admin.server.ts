import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function readPublicEnv(serverName: string, viteName: string) {
  return (
    process.env[serverName] ||
    process.env[viteName] ||
    (import.meta.env[viteName as keyof ImportMetaEnv] as string | undefined)
  );
}

export function getSupabaseAdmin() {
  const SUPABASE_URL = readPublicEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_SERVICE_ROLE_KEY ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
    ];
    console.error(`[backend] Missing required server environment: ${missing.join(", ")}`);
    throw new Error("Backend email service is not configured yet. Please contact support.");
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
