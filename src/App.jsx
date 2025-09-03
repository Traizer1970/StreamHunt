// src/App.jsx
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { motion } from "framer-motion";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase, safeSignOut } from "@/lib/supabase";
import {
  Menu, Star, GaugeCircle, ListChecks, Coins, Users, ShieldCheck,
  Sparkles, Wallet, Trophy, Sun, Moon, Gem, Flame,
  ChevronDown, LogOut, LayoutDashboard, ArrowRight, Link2, Type,
  Crown, CheckCircle2, FileText
} from "lucide-react";

import Dashboard from "./dashboard";
import Settings from "./settings";
import Terms from "./terms";
import TopNavLogged from "@/components/ui/TopNavLogged";
import AboutUpgrades from "./about-upgrades";
import BonusHuntsPage from "@/bonus-hunts.jsx";
import HuntDetail from "@/hunt-detail.jsx";
import { redirectIfLoggedToApp } from "@/guards/redirect-if-logged";
import { ThemeCtx, AuthCtx, useTheme, useAuth } from "@/contexts/auth-context";
import TournamentsPage from "@/tournaments";
import TournamentDetail from "@/tournament-detail.jsx";
import BattlesPage from "./battlespage.jsx";
import BattleView from "./battle-view.jsx";
import WidgetByToken from "./widget-by-token.jsx";
import HuntWidgetByToken from "./hunt-widget-by-token.jsx";

// Overlay
import WidgetOverlay from "./widget-overlay.jsx";
import HuntWidgetPage from "./hunt-widget.jsx";

/* =================== CONFIG =================== */
const TELEGRAM_URL = "https://t.me/gsousa70";
const DISCORD_URL = import.meta.env.VITE_DISCORD_URL || "https://discord.gg/your-invite";

/* Icons */
const DiscordIcon = ({ className = "", title = "Discord" }) => (
  <svg className={className} role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-label={title}>
    <title>{title}</title>
    <path fill="currentColor" d="M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.444.864-.608 1.249-1.844-.276-3.68-.276-5.486 0-.164-.404-.407-.874-.62-1.249a.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.045-.319 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.027c.461-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.041-.105 12.34 12.34 0 0 1-1.859-.89.077.077 0 0 1-.008-.127c.125-.094.25-.191.368-.291a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.119.1.243.198.368.292a.077.077 0 0 1-.007.127c-.585.346-1.207.643-1.86.89a.076.076 0 0 0-.041.106c.36.698.773 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.876 19.876 0 0 0 6.002-3.03.077.077 0 0 0 .031-.057c.5-5.177-.838-9.673-3.548-13.661a.061.061 0 0 0-.031-.028zM7.827 14.605c-1.182 0-2.158-1.085-2.158-2.419 0-1.333.955-2.419 2.158-2.419 1.21 0 2.181 1.096 2.159 2.419 0 1.334-.955 2.419-2.159 2.419zm8.334 0c-1.182 0-2.159-1.085-2.159-2.419 0-1.333.955-2.419 2.159-2.419 1.21 0 2.181 1.096 2.158 2.419 0 1.334-.948 2.419-2.158 2.419z"/>
  </svg>
);

const TwitchIcon = ({ className = "", title = "Twitch" }) => (
  <svg className={className} role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-label={title}>
    <title>{title}</title>
    <path fill="currentColor" d="M3 2.5 2 6.75v12.75h4.5V22h2.25l2.25-2.25h3.75L22 13.5V2.5H3zm17.25 9.75-3 3H12l-2.25 2.25H7.5v-2.25H4.5V4.75h15.75v7.5zM15 6.5h1.5v5.25H15V6.5zm-4.5 0H12v5.25h-1.5V6.5z"/>
  </svg>
);

/* ---------------- helpers ---------------- */
function Root() {
  useEffect(() => {
    redirectIfLoggedToApp();
  }, []);
  return <App />;
}
ReactDOM.createRoot(document.getElementById("root")).render(<Root />);

const cn = (...classes) => classes.filter(Boolean).join(" ");
const Section = ({ id, className = "", children }) => (
  <section id={id} className={cn("py-16 md:py-24", className)}>{children}</section>
);
const H2 = ({ children, className = "" }) => (
  <h2 className={cn("text-3xl md:text-4xl font-extrabold tracking-tight", className)}>{children}</h2>
);
const Pill = ({ children }) => (
  <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-sky-500/30 to-cyan-400/20 text-foreground/80 border border-sky-400/40 shadow-sm">
    {children}
  </span>
);

const glassCls = (isDark) =>
  isDark
    ? "border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.35)]"
    : "border border-zinc-200 bg-white/70 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)]";
const GradientText = ({ children }) => (
  <span className="bg-gradient-to-r from-sky-500 via-sky-400 to-sky-300 bg-clip-text text-transparent">{children}</span>
);

/* ---------- tiny UI helpers for Home ---------- */
function HeroMetric({ label, value, subtitle }) {
  const { isDark } = useTheme();
  return (
    <div className={cn("p-4 rounded-2xl border shadow-sm", isDark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white")}>
      <div className={cn("text-xs", isDark ? "text-white/60" : "text-zinc-600")}>{label}</div>
      <div className="mt-1 text-xl font-bold tracking-tight">{value}</div>
      {subtitle && <div className={cn("mt-1 text-xs", isDark ? "text-white/50" : "text-zinc-500")}>{subtitle}</div>}
    </div>
  );
}

function HomeTile({ icon, title, desc, onClick, tone = "neutral" }) {
  const { isDark } = useTheme();
  const toneGrad =
    tone === "gold" ? "from-sky-400/60 via-sky-300/20"
    : tone === "sky" ? "from-sky-400/50 via-sky-300/20"
    : "from-white/30 via-white/10";
  return (
    <button onClick={onClick} className="text-left group relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-0.5 rounded-2xl opacity-0 blur-md transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, rgba(56,189,248,0.25), rgba(56,189,248,0.08))` }}
      />
      <div className={cn("rounded-2xl p-[1px] relative bg-gradient-to-r", toneGrad, "to-transparent")}>
        <Card className={cn("rounded-[calc(theme(borderRadius.2xl)-1px)] transition-colors", isDark ? "bg-zinc-900/70 border-white/10" : "bg-white/95 border-zinc-200")}>
          <CardHeader className="flex flex-row items-start gap-3">
            <div className={cn("p-2 rounded-xl", isDark ? "bg-sky-400/10" : "bg-sky-500/10")}>
              {icon}
            </div>
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                {title}
                <ArrowRight className="h-4 w-4 translate-x-0 group-hover:translate-x-0.5 transition-transform" />
              </CardTitle>
              <CardDescription className={cn(isDark ? "text-white/70" : "text-zinc-600")}>
                {desc}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    </button>
  );
}

/* ---------- tiny UI helpers for Games ---------- */
const FeatureChip = ({ icon: Icon, children }) => {
  const { isDark } = useTheme();
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] border",
      isDark ? "border-white/10 bg-white/5 text-white/80" : "border-zinc-200 bg-zinc-50 text-zinc-700")}>
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
};

const GameCard = ({ title, desc, icon, free, features = [], highlight = false }) => {
  const { isDark } = useTheme();
  const pillCls = free
    ? "bg-white text-zinc-900 dark:bg-white/90 dark:text-black"
    : "bg-sky-500 text-white dark:bg-sky-400 dark:text-black";

  return (
    <motion.div whileHover={{ y: -3, scale: 1.01 }} transition={{ duration: 0.18 }} className="group relative">
      <div aria-hidden className="pointer-events-none absolute -inset-0.5 rounded-2xl opacity-0 blur-md transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: highlight ? "linear-gradient(90deg, rgba(56,189,248,0.35), rgba(56,189,248,0.08))" : "linear-gradient(90deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))" }} />
      <Card className={cn(glassCls(isDark), "relative rounded-2xl")}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 grid place-items-center rounded-xl",
                free ? (isDark ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-800")
                     : (isDark ? "bg-sky-400/20 text-sky-300" : "bg-sky-500/10 text-sky-700"))}>
                {icon}
              </div>
              <CardTitle className="text-[1.05rem] tracking-tight">{title}</CardTitle>
            </div>
            <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-sm", pillCls)}>
              {free ? "Free" : "Premium"}
            </span>
          </div>
          <CardDescription className={cn("mt-2", isDark ? "text-white/70" : "text-zinc-600")}>{desc}</CardDescription>
          {features.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {features.map((f, i) => (<FeatureChip key={i} icon={f.icon}>{f.text}</FeatureChip>))}
            </div>
          )}
        </CardHeader>
      </Card>
    </motion.div>
  );
};

/* --------------- FX --------------- */
const BackgroundFX = () => {
  const { isDark } = useTheme();
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {isDark ? (
        <>
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-sky-500/15 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(transparent_1px,rgba(255,255,255,0.04)_1px)] [background-size:16px_16px]" />
        </>
      ) : (
        <>
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-sky-300/40 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-cyan-300/40 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(transparent_1px,rgba(0,0,0,0.04)_1px)] [background-size:16px_16px]" />
        </>
      )}
    </div>
  );
};

/* --------------- tiny hash router --------------- */
function normalizeRoute(raw, def = "home") {
  if (!raw) return def;
  let r = raw.replace(/^#/, "");
  if (r.startsWith("/")) r = r.slice(1);
  // fix: quando volta de OAuth vem "#/auth#access_token=..."
  if (r.includes("#")) r = r.split("#")[0];
  if (r === "") return def;
  return r;
}
function useHashRoute(defaultRoute = "home") {
  const [route, setRoute] = useState(() =>
    normalizeRoute(typeof window !== "undefined" ? window.location.hash : "", defaultRoute)
  );
  useEffect(() => {
    const onHashChange = () => setRoute(normalizeRoute(window.location.hash, defaultRoute));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [defaultRoute]);
  const navigate = (to) => {
    const safe = normalizeRoute(to, defaultRoute);
    if (typeof window !== "undefined") window.location.hash = `/${safe}`;
    setRoute(safe);
  };
  return [route, navigate];
}

const NavLink = ({ to, current, onClick, children }) => {
  const { isDark } = useTheme();
  return (
    <button
      onClick={() => onClick(to)}
      className={[
        "px-4 py-2 text-sm rounded-xl transition font-medium",
        current === to
          ? (isDark ? "bg-sky-500 text-black shadow" : "bg-sky-600 text-white shadow")
          : (isDark ? "text-white/80 hover:bg-white/5 hover:text-white"
                    : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"),
      ].join(" ")}
    >
      {children}
    </button>
  );
};

/* ---------- Theme toggle ---------- */
function ThemeIconToggle() {
  const { isDark, toggle } = useTheme();
  return null;
}

/* ---------- Simple modal ---------- */
/* ---------- Simple modal (FIX: só bloqueia scroll quando open=true) ---------- */
function BareModal({ open, onClose, children }) {
  const { isDark } = useTheme();

  React.useEffect(() => {
    if (!open) return; // não tocar no body se o modal estiver fechado

    const html = document.documentElement;
    const body = document.body;
    const sbw = window.innerWidth - html.clientWidth;

    const prev = {
      htmlBg: html.style.background,
      bodyBg: body.style.background,
      bodyMargin: body.style.margin,
      overflow: body.style.overflow,
      marginRight: body.style.marginRight,
    };

    html.style.background = "transparent";
    body.style.background = "transparent";
    body.style.margin = "0";
    body.style.overflow = "hidden"; // bloqueia scroll só enquanto o modal está aberto
    if (sbw > 0) body.style.marginRight = `${sbw}px`;

    // ao fechar o modal, repõe os estilos originais
    return () => {
      html.style.background = prev.htmlBg;
      body.style.background = prev.bodyBg;
      body.style.margin = prev.bodyMargin;
      body.style.overflow = prev.overflow;
      body.style.marginRight = prev.marginRight;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-[520px]">
        <div
          className={cn(
            "rounded-2xl p-6 border shadow-2xl max-h-[90vh] overflow-auto",
            isDark ? "bg-gradient-to-b from-zinc-900 to-zinc-950 border-white/10" : "bg-white border-zinc-200"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}


/* -------- auth helpers -------- */
function mapAuthErrorInfo(err) {
  const msg = String(err?.message || "").toLowerCase();
  const status = err?.status;
  if (msg.includes("invalid login credentials")) return "Invalid email or password.";
  if (msg.includes("already registered") || msg.includes("already exists")) return "User already exists.";
  if (msg.includes("network")) return "Network error. Please try again.";
  if (status === 429 || msg.includes("too many")) return "Too many attempts. Please wait and try again.";
  if (msg.includes("password")) return "Your password is too weak.";
  return "Something went wrong.";
}

function getPlanLabel(user, profile) {
  if (!user) return null;
  const plan = String(profile?.plan || "Free").toLowerCase();
  if (plan === "free") return "Free";
  if (["premium","pro","plus","valek","cig_pais","mossdiboss"].includes(plan)) return "Premium";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

/* ---- avatar fallback (imediato via Twitch) ---- */
const getAuthAvatar = (user) => {
  const md = user?.user_metadata || {};
  return (
    md.avatar_url ||
    md.picture ||
    (user?.identities?.[0]?.identity_data?.avatar_url) ||
    ""
  );
};

/* ---------------- User Menu ---------------- */
const UserMenu = ({ onGoDashboard, onGoSettings, onLogout }) => {
  const { isDark } = useTheme();
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);

  const displayName =
    profile?.username ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";

  const planLabel = getPlanLabel(user, profile) || "";
  const avatar = profile?.avatar_url || getAuthAvatar(user) || "";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn("flex items-center gap-3 px-3 py-2 rounded-xl", isDark ? "bg-white/5 hover:bg-white/10" : "bg-zinc-100 hover:bg-zinc-200")}
      >
        {avatar ? (
          <img src={avatar} alt="avatar" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className={cn("h-8 w-8 rounded-full grid place-items-center font-semibold", isDark ? "bg-sky-500/20 text-sky-300" : "bg-sky-500/15 text-sky-700")}>
            {displayName.slice(0,1).toUpperCase()}
          </div>
        )}

        <div className="text-left leading-tight">
          <div className={cn("text-sm font-medium", isDark ? "text-white" : "text-zinc-900")}>{displayName}</div>
          <div className={cn("text-[11px]", isDark ? "text-white/60" : "text-zinc-600")}>{planLabel}</div>
        </div>
        <ChevronDown className={cn("h-4 w-4", isDark ? "text-white/70" : "text-zinc-700")} />
      </button>

      {open && (
        <div className={cn("absolute right-0 mt-2 w-48 rounded-xl overflow-hidden border z-50", isDark ? "bg-zinc-900 border-white/10 shadow-2xl" : "bg-white border-zinc-200 shadow-xl")}>
          <button
            onClick={() => { setOpen(false); onGoDashboard(); }}
            className={cn("w-full px-3 py-2 text-left text-sm flex items-center gap-2", isDark ? "hover:bg-white/5" : "hover:bg-zinc-100")}
          >
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </button>
          <button
            onClick={() => { setOpen(false); onGoSettings(); }}
            className={cn("w-full px-3 py-2 text-left text-sm flex items-center gap-2", isDark ? "hover:bg-white/5" : "hover:bg-zinc-100")}
          >
            <Users className="h-4 w-4" /> Settings
          </button>
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className={cn("w-full px-3 py-2 text-left text-sm flex items-center gap-2", isDark ? "hover:bg-white/5" : "hover:bg-zinc-100")}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
};

// ------------------ Shell ------------------
const Shell = ({ route, navigate, children }) => {
  const isDark = true;
  const toggle = () => {};

  // Auth modal
  const [showAuth, setShowAuth] = useState(false);

  // email/pass (para contas antigas)
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // toast
  const [toast, setToast] = useState(null);
  const showToast = (payload) => setToast(payload);

  // Auth state + profile
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const refreshProfile = async (u = user) => {
    try {
      if (!u) { setProfile(null); return; }
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .maybeSingle();
      if (error) throw error;
      setProfile(data || null);
    } catch (e) {
      console.warn("Failed to load profile:", e?.message || e);
    }
  };

  // sincroniza avatar/username da OAuth para profiles
  const maybeSyncProfileFromAuth = async (u) => {
    try {
      if (!u) return;
      const md = u.user_metadata || {};
      const nextAvatar = md.avatar_url || md.picture || null;
      const nextUsername =
        profile?.username ||
        md.name ||
        md.nickname ||
        md.preferred_username ||
        (u.email ? u.email.split("@")[0] : null);

      const { data: existing } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", u.id)
        .maybeSingle();

      const needs =
        !existing ||
        existing.username !== nextUsername ||
        (nextAvatar && existing.avatar_url !== nextAvatar);

      if (needs) {
        await supabase.from("profiles").upsert({
          id: u.id,
          username: nextUsername || existing?.username || null,
          avatar_url: nextAvatar || existing?.avatar_url || null,
        });
      }
    } catch (e) {
      console.warn("sync profile from auth failed:", e?.message || e);
    }
  };

  // bootstrap auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user || null;
      setUser(u);
      if (u) {
        maybeSyncProfileFromAuth(u).finally(() => refreshProfile(u));
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      const u = sess?.user || null;
      setUser(u);
      if (u) {
        maybeSyncProfileFromAuth(u).finally(() => refreshProfile(u));
      } else {
        setProfile(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPass,
      });
      if (error) throw error;
      await refreshProfile(data?.user || null);
      showToast({ title: "Welcome!", message: "Login successful.", success: true });
      setShowAuth(false);
      navigate("dashboard");
    } catch (err) {
      showToast({ title: "Error", message: mapAuthErrorInfo(err), success: false });
    }
  };

  const handleLogout = async () => {
    await safeSignOut();
    setProfile(null);
    navigate("home");
  };

  // usa /auth (sem #) para evitar duplo hash)
  const handleTwitchLogin = async () => {
    try {
      const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin;
      const redirectTo = `${SITE_URL}/auth`; // ← sem hash
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "twitch",
        options: {
          redirectTo,
          scopes: "user:read:email",
        },
      });
      if (error) throw error;
    } catch (err) {
      showToast({
        title: "Falha no login com Twitch",
        message: err?.message || "Tenta outra vez.",
        success: false,
      });
    }
  };

  useEffect(() => {
    // Se viermos de /auth#access_token=..., o supabase-js processa automaticamente;
    // aqui só limpamos o URL.
    const hasTokens = /access_token=|refresh_token=/.test(window.location.hash);
    const onBoot = async () => {
      if (hasTokens) {
        await supabase.auth.getSession().catch(() => {});
        history.replaceState({}, "", `${window.location.origin}/#/dashboard`);
      } else if (window.location.pathname === "/auth") {
        history.replaceState({}, "", `${window.location.origin}/#/home`);
      }
    };
    onBoot();
  }, []);

  // erros vindos no hash (ex.: redirect mismatch)
  useEffect(() => {
    const h = window.location.hash || "";
    if (h.includes("error=")) {
      const params = new URLSearchParams(h.split("#").pop());
      const errorDesc = decodeURIComponent(params.get("error_description") || "").replace(/\+/g, " ");
      history.replaceState(null, "", window.location.pathname + window.location.search + "#/home");
      showToast({ title: "Error", message: errorDesc || "Something went wrong.", success: false });
    }
  }, []);

  // Evento global para abrir modal
  useEffect(() => {
    const onOpenAuth = () => setShowAuth(true);
    window.addEventListener("open-auth", onOpenAuth);
    return () => window.removeEventListener("open-auth", onOpenAuth);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, profile, refreshProfile }}>
      <ThemeCtx.Provider value={{ isDark, toggle }}>
        <div className={cn("relative min-h-screen", isDark ? "bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white" : "bg-gradient-to-b from-zinc-50 via-white to-white text-zinc-900")}>
          <BackgroundFX />
          {/* Header */}
          <header className={cn("sticky top-0 z-40 border-b backdrop-blur-xl supports-[backdrop-filter]:bg-opacity-40",
            isDark ? "border-white/10 bg-zinc-950/40" : "border-zinc-200 bg-white/60")}>
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex h-20 items-center justify-between">
                {/* Brand */}
                <div className="flex items-center gap-3">
                  <motion.div whileHover={{ rotate: 10 }} className={cn("p-2 rounded-xl", isDark ? "bg-sky-400/15" : "bg-sky-500/10")}>
                    <GaugeCircle className={cn("h-6 w-6", isDark ? "text-sky-400" : "text-sky-600")} />
                  </motion.div>
                  <div className={cn("font-bold tracking-tight text-xl", isDark ? "text-white" : "text-zinc-900")}>
                    StreamHunt Studio
                  </div>
                  {user && <Pill>{getPlanLabel(user, profile)}</Pill>}
                </div>

                {/* Center nav */}
                <div className="hidden md:block flex-1">
                  {!user ? (
                    <nav className="flex items-center gap-2 justify-center">
                      <NavLink to="home" current={route} onClick={navigate}>Home</NavLink>
                      <NavLink to="widgets" current={route} onClick={navigate}>Widgets</NavLink>
                      <NavLink to="games" current={route} onClick={navigate}>Games</NavLink>
                      <NavLink to="premium" current={route} onClick={navigate}>Plans</NavLink>
                    </nav>
                  ) : (
                    <TopNavLogged
                      current={route}
                      onSelect={(id) => {
                        const map = {
                          dashboard: "dashboard",
                          widgets: "widgets",
                          now: "dashboard",
                          hunts: "hunts",
                          requests: "dashboard",
                          api: "dashboard",
                          tournaments: "tournaments",
                          battles: "battles",
                          wSettings: "dashboard",
                          wThemes: "dashboard",
                          stats: "dashboard",
                          spinners: "dashboard",
                          about: "about",
                        };
                        navigate(map[id] || "dashboard");
                      }}
                    />
                  )}
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2">
                  <ThemeIconToggle />
                  {user ? (
                    <UserMenu
                      onGoDashboard={() => navigate("dashboard")}
                      onGoSettings={() => navigate("settings")}
                      onLogout={handleLogout}
                    />
                  ) : (
                    <>
                      <Button variant="outline" size="sm" className={isDark ? "" : "border-zinc-300 text-zinc-800"} onClick={() => setShowAuth(true)}>
                        Login
                      </Button>
                      <Button size="sm" className={cn(isDark ? "bg-sky-500 text-black hover:bg-sky-400 shadow" : "bg-sky-600 text-white hover:bg-sky-500 shadow")} onClick={() => navigate("premium")}>
                        <Star className="h-4 w-4 mr-1" /> Premium
                      </Button>
                    </>
                  )}
                </div>

                {/* Mobile menu toggle */}
                <button className={cn("md:hidden p-2 rounded-xl", isDark ? "hover:bg-white/5" : "hover:bg-zinc-100")}
                        onClick={() => navigate(route === "menu" ? "home" : "menu")}>
                  <Menu className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Mobile menu */}
            {route === "menu" && (
              <div className={cn("md:hidden border-t", isDark ? "border-white/10 bg-zinc-900/90" : "border-zinc-200 bg-white/90")}>
                <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap gap-2">
                  {!user ? (
                    <>
                      {[
                        ["home","Home"],["widgets","Widgets"],["games","Games"],["premium","Premium"]
                      ].map(([to, label]) => (
                        <Button key={to} variant="ghost" onClick={() => navigate(to)} className={cn(isDark ? "text-white/80 hover:text-white" : "text-zinc-700 hover:bg-zinc-100")}>
                          {label}
                        </Button>
                      ))}
                      <div className="w-full mt-1">
                        <Button variant="outline" className={cn("w-full", isDark ? "" : "border-zinc-300 text-zinc-800")} onClick={() => setShowAuth(true)}>
                          Login
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="w-full flex items-center justify-end"><ThemeIconToggle /></div>
                  )}
                </div>
              </div>
            )}
          </header>

          <main className="max-w-7xl mx-auto px-4">{children}</main>

          <footer className={cn("mt-16 border-t", isDark ? "border-white/10" : "border-zinc-200")}>
            <div className={cn("max-w-7xl mx-auto px-4 py-8 text-sm flex flex-col md:flex-row gap-3 md:gap-6 items-center justify-between",
              isDark ? "text-white/70" : "text-zinc-600")}>
              <div className="flex items-center gap-2">
                <ShieldCheck className={cn("h-4 w-4", isDark ? "text-sky-400" : "text-sky-600")} />
                <span>Play responsibly. 18+.</span>
              </div>
              <div className="flex items-center gap-3">
                <a href="#/terms" className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-md border transition",
                    isDark ? "border-white/10 text-white/80 hover:bg-white/5" : "border-zinc-300 text-zinc-700 hover:bg-zinc-50")}
                   title="Read our Terms & Conditions">
                  <FileText className="h-4 w-4" /> Terms &amp; Conditions
                </a>
                <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" aria-label="Join us on Discord" title="Join us on Discord"
                   className={cn("inline-flex items-center justify-center h-8 w-8 rounded-md border transition",
                     isDark ? "border-white/10 text-white/80 hover:bg-white/5" : "border-zinc-300 text-zinc-700 hover:bg-zinc-50")}>
                  <DiscordIcon className="h-4 w-4" />
                </a>
              </div>
              <div>© {new Date().getFullYear()} StreamHunt Studio</div>
            </div>
          </footer>

          {/* Auth Modal */}
          <BareModal open={showAuth} onClose={() => setShowAuth(false)}>
            <div className={cn("mb-4 text-lg font-semibold", isDark ? "text-white" : "text-zinc-900")}>Login</div>
            <p className={cn("text-sm mb-4", isDark ? "text-white/70" : "text-zinc-600")}>
              Se já tinhas conta, entra com email e palavra-passe. Ou usa a tua conta <strong>Twitch</strong>.
            </p>

            {/* Email + password */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-11 rounded-xl px-4 bg-zinc-100 text-zinc-900 placeholder:text-zinc-500 dark:bg-zinc-800 dark:text-white dark:placeholder:text-white/50 border border-transparent focus-visible:ring-2 focus-visible:ring-sky-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input id="login-password" type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 rounded-xl px-4 bg-zinc-100 text-zinc-900 placeholder:text-zinc-500 dark:bg-zinc-800 dark:text-white dark:placeholder:text-white/50 border border-transparent focus-visible:ring-2 focus-visible:ring-sky-500" />
              </div>
              <Button className="w-full h-11 rounded-xl bg-sky-600 text-white hover:bg-sky-500 dark:bg-sky-500 dark:hover:bg-sky-400" onClick={handleLogin}>
                Login com email
              </Button>
            </div>

            <div className={cn("mt-6 mb-4 flex items-center gap-3 text-xs", isDark ? "text-white/40" : "text-zinc-400")}>
              <div className="h-px flex-1 bg-current/30" /><span>ou</span><div className="h-px flex-1 bg-current/30" />
            </div>

            <Button variant="outline" onClick={handleTwitchLogin}
              className={cn("w-full h-11 rounded-xl flex items-center justify-center gap-2",
                isDark ? "border-white/15 text-white hover:bg-white/10" : "border-zinc-300 text-zinc-800 hover:bg-zinc-100")}>
              <TwitchIcon className="h-4 w-4" /> Entrar com Twitch
            </Button>
          </BareModal>

          {toast && (
            <Toast open title={toast.title} message={toast.message} success={toast.success} onClose={() => setToast(null)} />
          )}
        </div>
      </ThemeCtx.Provider>
    </AuthCtx.Provider>
  );
};

/* ---------- Toast ---------- */
function Toast({ open, onClose, title, message, success = true, duration = 2500 }) {
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(onClose, duration);
    return () => clearTimeout(id);
  }, [open, duration, onClose]);
  if (!open) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[70]">
      <div className={[
        "min-w-[260px] max-w-[360px] rounded-xl border px-3 py-2 shadow-lg",
        success ? "bg-emerald-600/15 border-emerald-500/30 text-emerald-200"
                : "bg-red-600/15 border-red-500/30 text-red-200",
      ].join(" ")}>
        {title && <div className="font-semibold text-sm">{title}</div>}
        {message && <div className="text-[13px] opacity-90">{message}</div>}
      </div>
    </div>
  );
}

/* ---------- HOME ---------- */
const Home = ({ goPremium, navigate }) => {
  const { isDark } = useTheme();
  return (
    <>
      <Section id="hero" className="pt-10 md:pt-16">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              <GradientText>Your studio for hunts & widgets</GradientText>
            </motion.h1>
            <p className={cn("mt-4 text-lg max-w-[48ch]", isDark ? "text-white/70" : "text-zinc-600")}>
              Manage hunts, show stats, and monetize your stream with polished widgets and mini-games.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" className={cn("shadow-lg", isDark ? "bg-sky-500 text-white hover:bg-sky-400" : "bg-sky-600 text-white hover:bg-sky-500")} onClick={goPremium}>
                <Star className="h-4 w-4 mr-2" /> Get started
              </Button>
              <Button size="lg" variant="outline" className={cn("shadow-sm", isDark ? "border-white/20 hover:bg-white/5" : "border-zinc-300 text-zinc-800 hover:bg-zinc-100")} onClick={() => navigate("widgets")}>
                View widgets
              </Button>
            </div>
            <div className={cn("mt-6 flex items-center gap-4 text-sm flex-wrap", isDark ? "text-white/80" : "text-zinc-700")}>
              <div className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Easy payouts</div>
              <div className="flex items-center gap-2"><Trophy className="h-4 w-4" /> Stream-friendly</div>
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Ready-to-use widgets</div>
            </div>
          </div>

          <Card className={cn(glassCls(isDark), "relative overflow-hidden")}>
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
            <CardHeader>
              <CardTitle>Widgets in seconds</CardTitle>
              <CardDescription>Paste into OBS and you’re done.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <HeroMetric label="Amount won" value={<span>€ 12 750,38</span>} />
                <HeroMetric label="Average bet" value={<span>€ 2.50</span>} />
                <HeroMetric label="To open" value={12} />
                <div className={cn("p-4 rounded-2xl border shadow-sm", isDark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white")}>
                  <div className={cn("text-sm mb-2", isDark ? "text-white/60" : "text-zinc-600")}>Progress</div>
                  <div className={cn("w-full h-2 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-zinc-200")}>
                    <div className={cn("h-full", isDark ? "bg-sky-400" : "bg-sky-600")} style={{ width: "62%" }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section>
        <H2 className="text-sky-600">Included</H2>
        <p className={cn("mt-2 max-w-2xl", isDark ? "text-white/70" : "text-zinc-600")}>
          Everything you need to run hunts and show results.
        </p>
        <div className="grid md:grid-cols-3 gap-5 mt-6">
          <HomeTile icon={<GaugeCircle className="h-5 w-5" />} title="Widgets" desc="Copy to OBS and you're done." onClick={() => navigate("widgets")} tone="neutral" />
          <HomeTile icon={<Users className="h-5 w-5" />} title="Games" desc="Mini-games for your stream." onClick={() => navigate("games")} tone="gold" />
          <HomeTile icon={<Star className="h-5 w-5" />} title="Premium" desc="Unlock all features." onClick={() => navigate("premium")} tone="sky" />
        </div>
      </Section>
    </>
  );
};

/* -------- Widgets page -------- */
const widgetsList = [
  { id: "amountWon", free: true, title: "amountWon", desc: "Shows the total amount won in the hunt." },
  { id: "averageBet", free: true, title: "averageBet", desc: "Average bet size across spins/games." },
  { id: "avgBonusCost", free: true, title: "avgBonusCost", desc: "Average cost per bonus purchased." },
  { id: "currentMulti", free: false, title: "currentMulti", desc: "Current multiplier during the hunt." },
  { id: "bestPayout", free: false, title: "bestPayout", desc: "Highest single payout so far." },
  { id: "simpleList", free: true, title: "simpleList", desc: "Simple list of hits, wins or events." },
  { id: "remaining", free: true, title: "remaining", desc: "How many bonuses/games are left to open." },
  { id: "progress", free: true, title: "progress", desc: "Overall progress bar for the hunt." },
];

const widgetIcons = {
  amountWon: Coins, averageBet: GaugeCircle, avgBonusCost: Wallet,
  currentMulti: Flame, bestPayout: Trophy, simpleList: ListChecks,
  remaining: Users, progress: Sparkles,
};

function WidgetCard({ w }) {
  const { isDark } = useTheme();
  const Icon = widgetIcons[w.id] || Sparkles;
  const pillCls = w.free
    ? "bg-white text-zinc-900 dark:bg-white/90 dark:text-black"
    : "bg-sky-500 text-white dark:bg-sky-400 dark:text-black";

  return (
    <motion.div whileHover={{ y: -3, scale: 1.01 }} transition={{ duration: 0.18 }} className="group relative">
      <div className="pointer-events-none absolute -inset-0.5 rounded-2xl opacity-0 blur-md transition-opacity duration-200 group-hover:opacity-100"
           style={{ background: w.free ? "linear-gradient(90deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))" : "linear-gradient(90deg, rgba(56,189,248,0.35), rgba(56,189,248,0.08))" }} />
      <div className={cn("rounded-2xl p-[1px] relative", w.free ? "bg-gradient-to-r from-white/30 via-white/10 to-transparent" : "bg-gradient-to-r from-sky-400/60 via-sky-300/20 to-transparent")}>
        <Card className={cn("rounded-[calc(theme(borderRadius.2xl)-1px)] transition-colors",
          isDark ? "bg-zinc-900/65 border-white/10" : "bg-white/95 border-zinc-200")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 grid place-items-center rounded-xl",
                  w.free ? (isDark ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-800")
                         : (isDark ? "bg-sky-400/20 text-sky-300" : "bg-sky-500/10 text-sky-700"))}>
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-[1.05rem] tracking-tight">{w.title}</CardTitle>
              </div>
              <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-sm", pillCls)}>
                {w.free ? "Free" : "Premium"}
              </span>
            </div>
            <CardDescription className={cn("mt-2 leading-snug", isDark ? "text-white/70" : "text-zinc-600")}>
              {w.desc}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className={cn("flex items-center gap-3 text-[11px]", isDark ? "text-white/50" : "text-zinc-500")}>
              <div className="inline-flex items-center gap-1"><GaugeCircle className="h-3.5 w-3.5" /> Overlay-ready</div>
              <div className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> Clean typography</div>
              {!w.free && <div className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5" /> Pro feature</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

const WidgetsPage = () => {
  const { isDark } = useTheme();
  return (
    <Section>
      <H2 className="text-sky-600">Widgets</H2>
      <p className={cn("mt-2", isDark ? "text-white/70" : "text-zinc-600")}>Paste into OBS</p>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 mt-6">
        {widgetsList.map((w) => (<WidgetCard key={w.id} w={w} />))}
      </div>
    </Section>
  );
};

/* -------- Games page -------- */
const gamesList = [
  { id: "deal", title: "deal", desc: "Deal or no deal mini-game.", free: true, icon: <Coins className="h-5 w-5" />,
    features: [{ icon: Link2, text: "Overlay-ready" }, { icon: Type, text: "Clean typography" }], },
  { id: "wheel", title: "wheel", desc: "Spin the wheel with prizes.", free: false, icon: <Trophy className="h-5 w-5" />,
    features: [{ icon: Link2, text: "Overlay-ready" }, { icon: Crown, text: "Pro feature" }], highlight: true, },
  { id: "cards", title: "cards", desc: "Pick a card, win a reward.", free: true, icon: <ListChecks className="h-5 w-5" />,
    features: [{ icon: Link2, text: "Overlay-ready" }, { icon: Type, text: "Clean typography" }], },
];

const GamesPage = () => {
  const { isDark } = useTheme();
  return (
    <Section>
      <H2 className="text-sky-600">Games</H2>
      <p className={cn("mt-2", isDark ? "text-white/70" : "text-zinc-600")}>Mini-games for stream</p>
      <div className="grid md:grid-cols-3 gap-5 mt-6">
        {gamesList.map((g) => (
          <GameCard key={g.id} title={g.title} desc={g.desc} free={g.free} icon={g.icon} features={g.features} highlight={g.highlight} />
        ))}
      </div>
    </Section>
  );
};

/* -------- Premium page -------- */
const FeatureBullet = ({ children }) => {
  const { isDark } = useTheme();
  return (
    <div className="flex items-center gap-2 text-sm">
      <CheckCircle2 className={cn("h-4 w-4", isDark ? "text-sky-400" : "text-sky-600")} />
      <span className={cn(isDark ? "text-white/85" : "text-zinc-800")}>{children}</span>
    </div>
  );
};

const BadgeTag = ({ color = "primary", icon: Icon, children }) => {
  const palette = {
    primary: "border-sky-400/35 text-sky-200 bg-sky-500/10",
    neutral: "border-white/12 text-white/80 bg-white/6 dark:border-white/12 dark:text-white/80 dark:bg-white/5",
    sky: "border-sky-400/40 text-sky-200 bg-sky-500/10",
  };
  const cls = palette[color] || palette.primary;
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-[11px] font-semibold border", "backdrop-blur-sm", cls)}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
};

const PriceTag = ({ value, note, old }) => {
  const { isDark } = useTheme();
  return (
    <div className="mb-2">
      {old && <div className={cn("text-sm line-through mb-1", isDark ? "text-white/60" : "text-zinc-500")}>{old}</div>}
      <div className={cn("text-4xl font-extrabold tracking-tight bg-clip-text text-transparent",
        isDark ? "bg-gradient-to-r from-sky-300 to-sky-100" : "bg-gradient-to-r from-sky-700 to-sky-500")}>
        {value}
      </div>
      {note && <div className={cn("text-xs", isDark ? "text-white/60" : "text-zinc-500")}>{note}</div>}
    </div>
  );
};

const PricingCard = ({ tone = "free", plan, subtitle, price, oldPrice, priceNote, features = [], ctaText, ctaHref, onClick, tags = [] }) => {
  const { isDark } = useTheme();
  const ringByTone = { free: isDark ? "ring-1 ring-white/8" : "ring-1 ring-zinc-200/80", pro: isDark ? "ring-1 ring-sky-400/35" : "ring-1 ring-sky-600/25", custom: isDark ? "ring-1 ring-sky-400/35" : "ring-1 ring-sky-600/25" }[tone];
  const glowByTone = { free: "from-white/10", pro: "from-sky-400/20", custom: "from-sky-400/20" }[tone];
  const unifiedBtnClass = isDark ? "border-white/15 text-white hover:bg-white/10" : "border-zinc-300 text-zinc-800 hover:bg-zinc-100";
  return (
    <Card className={cn(glassCls(isDark), "relative overflow-hidden", ringByTone, "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl h-full flex flex-col")}>
      <div className={cn("pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl", "bg-gradient-to-b", glowByTone)} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{plan}</CardTitle>
            <div className={cn("text-sm", isDark ? "text-white/60" : "text-zinc-600")}>{subtitle}</div>
          </div>
          <div className="flex h-6 items-center gap-2">{tags.map((TagEl, i) => (<div key={i} className="shrink-0">{TagEl}</div>))}</div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 mt-1 grow">
        {price && <PriceTag value={price} note={priceNote} old={oldPrice} />}
        <div className="space-y-2">{features.map((f, i) => (<FeatureBullet key={i}>{f}</FeatureBullet>))}</div>
        <div className="grow" />
        {ctaHref ? (
          <Button asChild variant="outline" className={cn("w-full h-10 rounded-xl mt-2", unifiedBtnClass)}>
            <a href={ctaHref} target="_blank" rel="noopener noreferrer">{ctaText}</a>
          </Button>
        ) : (
          <Button variant="outline" className={cn("w-full h-10 rounded-xl mt-2", unifiedBtnClass)} onClick={onClick}>
            {ctaText}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

const PremiumPage = () => {
  const { isDark } = useTheme();
  return (
    <Section>
      <H2 className="text-sky-600">Plans</H2>
      <p className={cn("mt-2", isDark ? "text-white/70" : "text-zinc-600")}>Choose your plan</p>
      <div className="grid md:grid-cols-3 gap-5 mt-6">
        <PricingCard
          tone="free"
          plan="Trial"
          oldPrice="€9.99/mo"
          price="$0"
          subtitle="Get started"
          features={["Basic widgets", "OBS-ready links", "Community themes", "Email support"]}
          ctaText="Stay on Free"
          onClick={() => window.dispatchEvent(new CustomEvent("open-auth"))}
          tags={[]}
        />
        <PricingCard
          tone="pro"
          plan="Plus"
          subtitle="Everything included"
          price="€15/mo"
          features={["Premium widgets", "Theme builder", "Priority support", "Early access features"]}
          ctaText="Subscribe"
          onClick={() => {}}
          tags={[
            <BadgeTag key="rec" color="primary" icon={Star}>Recommended</BadgeTag>,
            <BadgeTag key="top" color="primary" icon={Flame}>Top seller</BadgeTag>,
          ]}
        />
        <PricingCard
          tone="custom"
          plan="Premium"
          subtitle="Teams & integrations"
          price="Contact us"
          features={["Custom integrations", "Team access", "Dedicated channels", "Service-level options"]}
          ctaText="Talk to us"
          ctaHref={TELEGRAM_URL}
          tags={[<BadgeTag key="ex" color="sky" icon={Gem}>Exclusive</BadgeTag>]}
        />
      </div>
    </Section>
  );
};

/* -------- Auth Callback (faz store da sessão) -------- */
function AuthCallback({ onDone }) {
  const { isDark } = useTheme();
  useEffect(() => {
    (async () => {
      try {
        await supabase.auth.getSessionFromUrl({ storeSession: true });
      } catch {
        // ok mesmo assim
      } finally {
        onDone && onDone();
      }
    })();
  }, [onDone]);
  return (
    <Section>
      <Card className={glassCls(isDark)}>
        <CardHeader>
          <CardTitle>Validating link…</CardTitle>
          <CardDescription>Please wait a moment.</CardDescription>
        </CardHeader>
        <CardContent><div className="animate-pulse text-sm">Redirecting…</div></CardContent>
      </Card>
    </Section>
  );
}

// ---- container transparente para o overlay ----
function BareOverlayContainer({ children }) {
  React.useEffect(() => {
    const html = document.documentElement;
    const prevHtmlBg = html.style.background;
    const prevBodyBg = document.body.style.background;
    const prevBodyMargin = document.body.style.margin;
    const prevOverflow = document.body.style.overflow;

    html.style.background = "transparent";
    document.body.style.background = "transparent";
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";

    return () => {
      html.style.background = prevHtmlBg;
      document.body.style.background = prevBodyBg;
      document.body.style.margin = prevBodyMargin;
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "transparent", display: "grid", placeItems: "center" }}>
      {children}
    </div>
  );
}

/* ---------------- App Root routing ---------------- */
export default function App() {
  const [route, navigate] = useHashRoute("home");

  // detail routes
  const huntDetailMatch = route.match(/^\/?hunts\/([^\/?#]+)$/);
  const tournamentDetailMatch = route.match(/^\/?tournaments\/([^\/?#]+)$/);

 if (route.startsWith("hunt-widget")) {
   return (
     <BareOverlayContainer>
       <HuntWidgetPage />
     </BareOverlayContainer>
   );
 }

// overlay: battle, hunt, ou token fixo
 const isOverlay =
   route.startsWith("overlay/battle/") ||
   route.startsWith("overlay/hunt/") ||       // ✅ NOVO
   route.startsWith("overlay/opening/") ||    // ✅ NOVO (se fores usar opening)
   route.startsWith("w/h/") ||
   route.startsWith("w/");

if (isOverlay) {
  return (
    <BareOverlayContainer>
      {route.startsWith("overlay/battle/") && <WidgetOverlay />}
      {(route.startsWith("overlay/hunt/") || route.startsWith("overlay/opening/")) && (
        <HuntWidgetPage />
      )}
      {route.startsWith("w/h/") && <HuntWidgetByToken />}
      {route.startsWith("w/") && !route.startsWith("w/h/") && <WidgetByToken />} {/* battle por token (o teu atual) */}
    </BareOverlayContainer>
  );
}

  const isDetailRoute =
    !!huntDetailMatch ||
    !!tournamentDetailMatch ||
    route.startsWith("battles/") ||
    route.startsWith("overlay/battle/");

  let content = null;

  if (huntDetailMatch) {
    const numberId = huntDetailMatch[1];
    content = <HuntDetail numberId={numberId} />;
  } else if (route.startsWith("w/")) {
    content = <WidgetByToken />;
  } else if (tournamentDetailMatch) {
    const tournamentId = tournamentDetailMatch[1];
    content = <TournamentDetail tournamentId={tournamentId} />;
  } else if (route.startsWith("overlay/battle/")) {
    content = <WidgetOverlay />;
  } else {
    content = (
      <>
        {route === "home" && <Home goPremium={() => navigate("premium")} navigate={navigate} />}
        {route === "widgets" && <WidgetsPage />}
        {route === "games" && <GamesPage />}
        {route === "premium" && <PremiumPage />}
        {route === "auth" && <AuthCallback onDone={() => navigate("dashboard")} />}
        {route === "dashboard" && <Dashboard />}
        {route === "settings" && <Settings />}
        {route === "about" && <AboutUpgrades />}
        {route === "hunts" && <BonusHuntsPage />}
        {route === "terms" && <Terms />}
        {route === "tournaments" && <TournamentsPage />}
        {route === "battles" && <BattlesPage />}
        {route === "hunts" && <BattlesPage />}
        

        {!(
          ["home","widgets","games","premium","auth","dashboard","settings","about","hunts","tournaments","battles","terms"].includes(route) || isDetailRoute
        ) && <Home goPremium={() => navigate("premium")} navigate={navigate} />}
      </>
    );
  }

  return (
    <Shell route={route} navigate={navigate}>
      {content}
    </Shell>
  );
}
