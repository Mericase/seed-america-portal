import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { serverEnv } from "./runtime-env.server";

function readPublicEnv(serverName: string, viteName: string) {
  return serverEnv(serverName, viteName);
}

export function getSupabaseAdmin() {
  const SUPABASE_URL = readPublicEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = serverEnv("SUPABASE_SERVICE_ROLE_KEY");

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

export function getSupabaseServerClient() {
  const SUPABASE_URL = readPublicEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
  const SUPABASE_PUBLISHABLE_KEY = readPublicEnv("SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    console.error(`[backend] Missing required public backend environment: ${missing.join(", ")}`);
    throw new Error("Backend service is not configured yet. Please contact support.");
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
