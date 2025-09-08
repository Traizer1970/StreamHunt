// src/about-upgrades.jsx
import React from "react";
import { useTheme } from "@/contexts/auth-context";
import {
  Check, Minus, ShieldCheck, Star, Crown, Info, Sparkles, GaugeCircle,
  LayoutDashboard, Users, Trophy, Cog, BarChart3, Wrench, Zap, Clock
} from "lucide-react";

const TELEGRAM_URL = "https://t.me/gsousa70";
const FREE_HUNTS_LIMIT = 1;

const Cell = ({ value }) => {
  if (value === true) return <Check className="h-4 w-4 text-emerald-400" />;
  if (value === false) return <Minus className="h-4 w-4 opacity-70" />;
  return <span className="text-sm opacity-90">{value}</span>;
};

const Row = ({ icon, label, free, plus, custom }) => (
  <div className="grid grid-cols-12 items-center py-3 border-b border-white/10 last:border-b-0">
    <div className="col-span-5 flex items-center gap-2">
      <span className="p-1.5 rounded-lg bg-white/5">{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
    <div className="col-span-2 flex items-center justify-center"><Cell value={free} /></div>
    <div className="col-span-2 flex items-center justify-center"><Cell value={plus} /></div>
    <div className="col-span-3 flex items-center justify-center"><Cell value={custom} /></div>
  </div>
);

export default function AboutUpgrades() {
  const { isDark } = useTheme();

  const rows = [
    { icon: <GaugeCircle className="h-4 w-4" />, label: "Bonus hunts",           free: `Up to ${FREE_HUNTS_LIMIT}`, plus: "Unlimited",       custom: "Unlimited" },
    { icon: <LayoutDashboard className="h-4 w-4" />, label: "Streaming widgets", free: 26,                         plus: 41,                custom: "All" },
    { icon: <Users className="h-4 w-4" />,          label: "Stream games",        free: false,                      plus: true,              custom: true },
    { icon: <Info className="h-4 w-4" />,           label: "Bonus opening recap", free: false,                      plus: true,              custom: true },
    { icon: <Trophy className="h-4 w-4" />,         label: "Tournaments",         free: false,                      plus: true,              custom: true },
    { icon: <Zap className="h-4 w-4" />,            label: "Battles",             free: false,                      plus: true,              custom: true },
    { icon: <Cog className="h-4 w-4" />,            label: "Chat commands",       free: false,                      plus: true,              custom: true },
    { icon: <Wrench className="h-4 w-4" />,         label: "Hunt API",            free: false,                      plus: true,              custom: true },
    { icon: <Info className="h-4 w-4" />,           label: "Info panels",         free: false,                      plus: true,              custom: true },
    { icon: <Sparkles className="h-4 w-4" />,       label: "Custom widgets",      free: false,                      plus: true,              custom: "Bespoke" },
    { icon: <Sparkles className="h-4 w-4" />,       label: "Custom themes",       free: false,                      plus: true,              custom: "Bespoke" },
    { icon: <Crown className="h-4 w-4" />,          label: "Hot words",           free: false,                      plus: true,              custom: true },
    { icon: <Wrench className="h-4 w-4" />,         label: "Custom spinners",     free: false,                      plus: true,              custom: "Bespoke" },
    { icon: <BarChart3 className="h-4 w-4" />,      label: "Advanced stats",      free: false,                      plus: true,              custom: true },
    { icon: <Clock className="h-4 w-4" />,          label: "Refresh interval",    free: "Every 5 seconds",          plus: "Every 2 seconds", custom: "Every 1 second" },
  ];

  return (
    <section className="py-10 md:py-14">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
             <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-white/90">
             <ShieldCheck className="h-4 w-4 text-sky-400" />
            <span className="text-sm font-medium">Important</span>
          </div>
          <p className="mt-3 text-sm opacity-80">
            Free vs Plus vs Custom feature comparison. Details may evolve; contact us if you have questions.
          </p>
        </div>

        {/* Table */}
        <div className={["rounded-2xl overflow-hidden border", isDark ? "border-white/10 bg-zinc-900/50" : "border-zinc-200 bg-white"].join(" ")}>
          <div className="grid grid-cols-12 items-center px-4 py-4 border-b border-white/10">
            <div className="col-span-5 text-sm font-semibold opacity-90">Feature</div>
            <div className="col-span-2 text-center">
              <div className="text-[11px] uppercase tracking-wide opacity-70">FREE</div>
              <div className="text-sm font-semibold">Free plan</div>
            </div>
            <div className="col-span-2 text-center">
              <div className="text-[11px] uppercase tracking-wide opacity-70">PLUS</div>
              <div className="text-sm font-semibold">Plus plan</div>
            </div>
            <div className="col-span-3 text-center">
              <div className="text-[11px] uppercase tracking-wide opacity-70">CUSTOM</div>
              <div className="text-sm font-semibold">Tailored plan</div>
            </div>
          </div>

          <div className="px-4">
            {rows.map((r, i) => <Row key={i} {...r} />)}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8">
          <div
   className={[
     "rounded-2xl p-6 border",
     isDark
       ? "border-sky-400/25 bg-gradient-to-br from-sky-500/10 to-sky-400/5"
       : "border-sky-400/40 bg-sky-50",
   ].join(" ")}
 >
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-lg font-bold flex items-center gap-2">
                  <Star className="h-5 w-5 text-sky-400" />
                  Choose your plan
                </div>
                <div className="text-sm opacity-80">
                  Unlock tournaments, battles, custom widgets and deep stats with Plus — or talk to us about a bespoke plan.
                </div>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="#/premium"
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-sky-500 text-black hover:bg-sky-400 shadow"
                >
                  Upgrade to Plus
                </a>
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 hover:border-sky-400/40 hover:text-sky-200 text-sm"
                >
                  Talk about Custom
                </a>
              </div>
            </div>

            <div className="mt-3 text-xs opacity-70">
              Bonus: Plus & Custom members get priority support.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
