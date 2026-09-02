import "./lib/error-capture";
import process from "node:process";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { captureRuntimeEnv } from "./lib/runtime-env.server";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

function installCloudflareEnv(env: unknown) {
  // Keep a copy of the raw Cloudflare bindings so helpers can resolve secrets
  // even when writing to process.env is not possible.
  captureRuntimeEnv(env);
  const apply = (key: string, value: unknown) => {
    if (typeof value !== "string" || !value) return;
    process.env[key] = value;
  };

  if (env && typeof env === "object") {
    const bindings = env as Record<string, unknown>;
    for (const [key, value] of Object.entries(bindings)) apply(key, value);

    // Self-hosted Cloudflare deployments often bind only the browser-style
    // VITE_* public values. Mirror them to the server names expected by
    // server functions and auth middleware so signup, OTP, and admin actions
    // do not fail with missing backend configuration on Cloudflare.
    apply("SUPABASE_URL", process.env.SUPABASE_URL || bindings.VITE_SUPABASE_URL);
    apply("SUPABASE_PUBLISHABLE_KEY", process.env.SUPABASE_PUBLISHABLE_KEY || bindings.VITE_SUPABASE_PUBLISHABLE_KEY || bindings.SUPABASE_ANON_KEY);
    apply("SUPABASE_PROJECT_ID", process.env.SUPABASE_PROJECT_ID || bindings.VITE_SUPABASE_PROJECT_ID);
  }

  // Build-time public fallbacks keep the server stable even when Cloudflare's
  // runtime env object omits public values. Secrets still must come from
  // Cloudflare/Lovable runtime bindings and are never embedded here.
  apply("SUPABASE_URL", process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL);
  apply("SUPABASE_PUBLISHABLE_KEY", process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  apply("SUPABASE_PROJECT_ID", process.env.SUPABASE_PROJECT_ID || import.meta.env.VITE_SUPABASE_PROJECT_ID);
}

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // Cloudflare Workers provides secrets as the per-request `env` object,
      // while TanStack server functions and Supabase helpers read `process.env`.
      // Bridge them before loading the server entry so Resend/Supabase secrets
      // are available on deployed Cloudflare builds exactly like local preview.
      installCloudflareEnv(env);
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
