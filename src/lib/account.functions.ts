import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Sign in with a username instead of an email address.
 * The username -> email resolution happens server-side only; the email is never
 * returned to the browser. A failed lookup and a wrong password return the same
 * generic error so usernames cannot be enumerated.
 */
export const signInWithUsername = createServerFn({ method: "POST" })
  .inputValidator((i: { username: string; password: string }) =>
    z
      .object({
        username: z.string().trim().min(3).max(24),
        password: z.string().min(1).max(200),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const GENERIC = "Invalid username or password";

    const { getSupabaseAdmin } = await import("./supabase-admin.server");
    const { serverEnv } = await import("./runtime-env.server");
    const supabaseAdmin = getSupabaseAdmin();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .ilike("username", data.username)
      .maybeSingle();

    const email = (profile as { email?: string } | null)?.email;
    if (!email) throw new Error(GENERIC);

    const { createClient } = await import("@supabase/supabase-js");
    const url = serverEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
    const key = serverEnv("SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY");
    if (!url || !key) throw new Error("Sign-in is temporarily unavailable. Please use your email address.");

    const anon = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data: signIn, error } = await anon.auth.signInWithPassword({ email, password: data.password });
    if (error || !signIn.session) throw new Error(GENERIC);

    return {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    };
  });
