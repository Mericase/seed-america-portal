/**
 * Shows a language-choice modal for German users who haven't picked a language yet.
 * Checks: user country === "DE" && profiles.language IS NULL.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

export function LanguagePrompt() {
  const { i18n } = useTranslation();
  const [show, setShow] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;
      setUserId(uid);

      const { data } = await supabase
        .from("profiles")
        .select("country, language")
        .eq("id", uid)
        .maybeSingle();

      if (!data) return;

      // If language already chosen, apply it silently
      if (data.language) {
        if (data.language !== i18n.language) {
          i18n.changeLanguage(data.language);
        }
        return;
      }

      // Only prompt German users
      if (data.country === "DE") {
        setShow(true);
      }
    })();
  }, [i18n]);

  const pick = async (lang: "de" | "en") => {
    i18n.changeLanguage(lang);
    setShow(false);
    if (userId) {
      await supabase.from("profiles").update({ language: lang } as any).eq("id", userId);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-primary/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-elegant text-center">
        <h2 className="font-display text-2xl font-semibold">Sprache wechseln?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Switch language?</p>
        <p className="mt-4 text-sm text-foreground">
          Möchten Sie die App auf Deutsch verwenden?
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Would you like to use the app in German?
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => pick("de")}
            className="flex-1 rounded-lg bg-gradient-forest px-5 py-3 text-sm font-semibold text-forest-foreground hover:opacity-95"
          >
            🇩🇪 Deutsch
          </button>
          <button
            onClick={() => pick("en")}
            className="flex-1 rounded-lg border border-input bg-background px-5 py-3 text-sm font-semibold hover:bg-accent"
          >
            🇺🇸 English
          </button>
        </div>
      </div>
    </div>
  );
}
