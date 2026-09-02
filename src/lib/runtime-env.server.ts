// runtime-env.server.ts — Server-only.
//
// On Cloudflare Workers, secrets and vars arrive as the per-request `env`
// object, NOT as process.env. `src/server.ts` mirrors them into process.env,
// but we also keep a captured copy here so every server helper can resolve a
// value even if the process.env mirror is unavailable (module evaluated in a
// different isolate, readonly process.env, etc).

let captured: Record<string, string> = {};

export function captureRuntimeEnv(env: unknown) {
  if (!env || typeof env !== "object") return;
  for (const [key, value] of Object.entries(env as Record<string, unknown>)) {
    if (typeof value === "string" && value) captured[key] = value;
  }
}

function fromImportMeta(name: string): string | undefined {
  try {
    const meta = import.meta.env as unknown as Record<string, string | undefined>;
    return meta?.[name];
  } catch {
    return undefined;
  }
}

/**
 * Resolve the first non-empty value among the given env var names.
 * Order: process.env -> captured Cloudflare bindings -> globalThis -> import.meta.env.
 */
export function serverEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const fromProcess = typeof process !== "undefined" ? process.env?.[name] : undefined;
    if (fromProcess) return fromProcess;
    if (captured[name]) return captured[name];
    const g = (globalThis as unknown as Record<string, unknown>)[name];
    if (typeof g === "string" && g) return g;
    const meta = fromImportMeta(name);
    if (meta) return meta;
  }
  return undefined;
}

/** True when every listed variable resolves to a non-empty value. */
export function hasEnv(...names: string[]): boolean {
  return names.every((n) => Boolean(serverEnv(n)));
}
