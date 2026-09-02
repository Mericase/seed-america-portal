import { createFileRoute } from "@tanstack/react-router";

/**
 * Deployment health check. Returns ONLY booleans — never a secret value.
 * Visit /api/public/health/config on any deployment (Lovable preview or
 * Cloudflare) to confirm the server has everything it needs.
 */
export const Route = createFileRoute("/api/public/health/config")({
  server: {
    handlers: {
      GET: async () => {
        const { serverEnv } = await import("@/lib/runtime-env.server");
        const has = (...n: string[]) => Boolean(serverEnv(...n));

        const core = {
          supabaseUrl: has("SUPABASE_URL", "VITE_SUPABASE_URL"),
          supabasePublishableKey: has("SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"),
          supabaseServiceRoleKey: has("SUPABASE_SERVICE_ROLE_KEY"),
        };
        const features = {
          email: has("RESEND_API_KEY") || has("LOVABLE_API_KEY"),
          adminTelegramBot: has("TELEGRAM_BOT_TOKEN") || (has("LOVABLE_API_KEY") && has("TELEGRAM_API_KEY")),
          sms: has("LOVABLE_API_KEY") && has("TWILIO_API_KEY") && has("TWILIO_FROM", "TWILIO_PHONE_NUMBER"),
          otpSigning:
            has("SIGNUP_OTP_SECRET") ||
            has("RESEND_API_KEY") ||
            has("LOVABLE_API_KEY") ||
            has("SUPABASE_SERVICE_ROLE_KEY"),
        };

        const missing = [
          ...Object.entries(core).filter(([, v]) => !v).map(([k]) => k),
          ...Object.entries(features).filter(([, v]) => !v).map(([k]) => k),
        ];

        return Response.json(
          { ok: missing.length === 0, core, features, missing },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
