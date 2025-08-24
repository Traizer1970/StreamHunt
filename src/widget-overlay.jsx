// src/widget-overlay.jsx
import React from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";

// ===== helpers =====
const LOCALE = "pt-PT";
const fmtMoney = (n) =>
  Number.isFinite(Number(n))
    ? new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR" }).format(Number(n))
    : "—";

const DEFAULT_THEME = {
  bgStart: "#0b1020",
  bgEnd: "#111827",
  panelBorder: "rgba(255,255,255,0.12)",
  panelBorderWidth: 1,
  text: "#e5e7eb",
  subtext: "#9ca3af",
  accent: "#7dd3fc",
  chipBg: "rgba(255,255,255,0.08)",
  chipBorder: "rgba(255,255,255,0.18)",
  chipBorderWidth: 1,
  chipRadius: 12,
  badgeBg: "rgba(255,255,255,0.08)",
  badgeBorder: "rgba(255,255,255,0.18)",
  badgeBorderWidth: 1,
  totalBg: "rgba(255,255,255,0.10)",
  totalBorder: "rgba(255,255,255,0.18)",
  totalBorderWidth: 1,
  pos: "#22c55e",
  neg: "#ef4444",
  vsBg: "rgba(99,102,241,0.35)",
  radius: 18,
  pillRadius: 16,
  fontFamily:
    "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji','Segoe UI Emoji'",
  fontScale: 100,
  fontWeight: 400,
  strongWeight: 500,
  showThumbs: true,
  shine: true,
  pulse: true,
};

const DEFAULT_LAYOUT = {
  mode: "default",
  positions: { badges: { x: 16, y: 12 }, playerA: { x: 40, y: 92 }, playerB: { x: 560, y: 92 }, chipsA: { x: 40, y: 180 }, chipsB: { x: 560, y: 180 }, total: { x: 360, y: 330 } },
};

const DEFAULT_OPTS = {
  bonusLabelMode: "label+value",
  bonusLabelText: "Bonus Buy",
  bonusDock: "left",
  totalJustify: "center",
  totalLabelMode: "label+value",
  totalLabelText: "Total paid",
};

async function dbLoadWidgetSettings(battleId) {
  const { data, error } = await supabase
    .from("battle_widget_settings")
    .select("theme, layout, options")
    .eq("battle_id", battleId)
    .maybeSingle();
  if (error) return { theme: null, layout: null, options: null };
  return {
    theme: data?.theme || null,
    layout: data?.layout || null,
    options: data?.options || null,
  };
}

// ===== tiny presentational bits reused here =====
function Chip({ theme, amount, ok, i }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 mr-2 mb-2 shadow-[0_0_0_1px_rgba(0,0,0,0.25)_inset,0_6px_18px_rgba(0,0,0,.36)]"
      style={{
        borderRadius: theme.chipRadius,
        background: ok ? `${theme.pos}1F` : `${theme.neg}1F`,
        border: `${theme.chipBorderWidth}px solid ${ok ? theme.pos : theme.neg}`,
        color: ok ? theme.pos : theme.neg,
        animation: theme.pulse ? `pop .16s ease-out both` : "none",
        animationDelay: `${(i || 0) * 45}ms`,
        fontSize: `calc(12px * ${theme.fontScale / 100})`,
        fontFamily: theme.fontFamily,
        fontWeight: theme.strongWeight,
      }}
      title={ok ? "Covers buy" : "Below buy"}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: ok ? theme.pos : theme.neg, boxShadow: `0 0 0 2px ${ok ? theme.pos : theme.neg}26` }} />
      {fmtMoney(Number(amount || 0))}
    </span>
  );
}

export default function WidgetOverlay() {
  const { id } = useParams(); // battle id
  const [theme, setTheme] = React.useState(DEFAULT_THEME);
  const [layout, setLayout] = React.useState(DEFAULT_LAYOUT);
  const [opts, setOpts] = React.useState(DEFAULT_OPTS);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  const [bestOf, setBestOf] = React.useState(1);
  const [buyCost, setBuyCost] = React.useState(0);
  const [playerA, setPlayerA] = React.useState("");
  const [playerB, setPlayerB] = React.useState("");
  const [sideA, setSideA] = React.useState(null);
  const [sideB, setSideB] = React.useState(null);
  const [pays, setPays] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");

        // load widget settings
        const { theme: t, layout: l, options: o } = await dbLoadWidgetSettings(id);
        if (t) setTheme({ ...DEFAULT_THEME, ...t });
        if (l) setLayout({ ...DEFAULT_LAYOUT, ...l });
        if (o) setOpts({ ...DEFAULT_OPTS, ...o });

        // load battle, entries, payments
        const { data: battle } = await supabase.from("battles").select("*").eq("id", id).maybeSingle();
        setBestOf(Number(battle?.best_of) || 1);
        setBuyCost(Number(battle?.buy_cost) || 0);

        const { data: es } = await supabase.from("battle_entries").select("seed, slot_name, player_name").eq("battle_id", id);
        const A = (es || []).find((e) => String(e.seed).toUpperCase() === "A");
        const B = (es || []).find((e) => String(e.seed).toUpperCase() === "B");
        setPlayerA(A?.player_name || "");
        setPlayerB(B?.player_name || "");
        setSideA(A?.slot_name ? { name: A.slot_name } : null);
        setSideB(B?.slot_name ? { name: B.slot_name } : null);

        const { data: ps } = await supabase.from("battle_payments").select("*").eq("battle_id", id).order("buy_idx", { ascending: true });
        setPays(ps || []);
      } catch (e) {
        setErr(e?.message || "Failed to load overlay");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const aPays = (pays || []).filter((r) => String(r.side || "").toUpperCase() === "L");
  const bPays = (pays || []).filter((r) => String(r.side || "").toUpperCase() === "R");
  const aTotal = aPays.reduce((s, r) => s + Number(r?.amount || 0), 0);
  const bTotal = bPays.reduce((s, r) => s + Number(r?.amount || 0), 0);
  const totalPay = aTotal + bTotal;

  return (
    <div
      className="min-h-screen p-6"
      style={{
        background: `linear-gradient(135deg, ${theme.bgStart}, ${theme.bgEnd})`,
        color: theme.text,
        fontFamily: theme.fontFamily,
        fontSize: `${theme.fontScale}%`,
      }}
    >
      <style>{`
        @keyframes pop { 0% { transform: scale(.96); opacity: 0;} 100% { transform: scale(1); opacity: 1;} }
      `}</style>

      {err ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{err}</div>
      ) : null}

      {/* Badges (Best/Bonus) */}
      <div className={opts.bonusDock === "right" ? "flex items-center justify-between gap-2" : "flex items-center gap-2"}>
        <div
          className="px-3 py-1.5"
          style={{
            background: theme.badgeBg,
            border: `${theme.badgeBorderWidth}px solid ${theme.badgeBorder}`,
            borderRadius: theme.pillRadius,
            fontWeight: theme.fontWeight,
          }}
        >
          <span>Best of</span>
          <span style={{ marginLeft: 6, fontWeight: theme.strongWeight }}>{bestOf}</span>
        </div>

        <div
          className="px-3 py-1.5"
          style={{
            background: theme.badgeBg,
            border: `${theme.badgeBorderWidth}px solid ${theme.badgeBorder}`,
            borderRadius: theme.pillRadius,
            fontWeight: opts.bonusLabelMode === "value" ? theme.strongWeight : theme.fontWeight,
            color: opts.bonusLabelMode === "value" ? theme.accent : theme.text,
          }}
        >
          {opts.bonusLabelMode === "value" ? (
            fmtMoney(buyCost)
          ) : (
            <>
              <span>{opts.bonusLabelText || "Bonus Buy"}</span>
              <span style={{ marginLeft: 8, color: theme.accent, fontWeight: theme.strongWeight }}>{fmtMoney(buyCost)}</span>
            </>
          )}
        </div>
      </div>

      {/* Players */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-5">
        <div className="flex items-center justify-end gap-3">
          <div className="min-w-0 text-right">
            <div className="truncate" style={{ fontSize: "22px", fontWeight: theme.strongWeight }}>{playerA || "—"}</div>
            <div className="text-[12px] truncate" style={{ color: theme.subtext, fontWeight: theme.fontWeight }}>{sideA?.name || "—"}</div>
          </div>
        </div>
        <div className="flex justify-center">
          <div className="px-3 py-1 text-xs" style={{ background: theme.vsBg, border: `${theme.panelBorderWidth}px solid ${theme.panelBorder}`, borderRadius: 10, fontWeight: theme.strongWeight }}>
            VS
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="min-w-0 text-left">
            <div className="truncate" style={{ fontSize: "22px", fontWeight: theme.strongWeight }}>{playerB || "—"}</div>
            <div className="text-[12px] truncate" style={{ color: theme.subtext, fontWeight: theme.fontWeight }}>{sideB?.name || "—"}</div>
          </div>
        </div>
      </div>

      {/* Chips + subtotals */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <div className="flex flex-wrap">
            {aPays.map((p, i) => (
              <Chip key={`a-${i}`} theme={theme} amount={p.amount} ok={Number(p.amount || 0) >= Number(buyCost || 0)} i={i} />
            ))}
          </div>
          <div
            className="inline-flex mt-3 items-center gap-2 px-3 py-1.5 text-[12px]"
            style={{ background: theme.chipBg, border: `${theme.chipBorderWidth}px solid ${theme.chipBorder}`, borderRadius: theme.radius, color: theme.subtext, fontWeight: theme.fontWeight }}
          >
            <span>Subtotal</span>
            <span style={{ color: theme.text, fontWeight: theme.strongWeight }}>{fmtMoney(aTotal)}</span>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap">
            {bPays.map((p, i) => (
              <Chip key={`b-${i}`} theme={theme} amount={p.amount} ok={Number(p.amount || 0) >= Number(buyCost || 0)} i={i} />
            ))}
          </div>
          <div
            className="inline-flex mt-3 items-center gap-2 px-3 py-1.5 text-[12px]"
            style={{ background: theme.chipBg, border: `${theme.chipBorderWidth}px solid ${theme.chipBorder}`, borderRadius: theme.radius, color: theme.subtext, fontWeight: theme.fontWeight }}
          >
            <span>Subtotal</span>
            <span style={{ color: theme.text, fontWeight: theme.strongWeight }}>{fmtMoney(bTotal)}</span>
          </div>
        </div>
      </div>

      {/* Total (left/center/right) */}
      <div
        className={
          opts.totalJustify === "left" ? "mt-6 flex justify-start" : opts.totalJustify === "right" ? "mt-6 flex justify-end" : "mt-6 flex justify-center"
        }
      >
        <div
          className="px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,.35)]"
          style={{ background: theme.totalBg, border: `${theme.totalBorderWidth}px solid ${theme.totalBorder}`, borderRadius: theme.pillRadius, color: theme.accent, fontWeight: theme.strongWeight }}
        >
          {opts.totalLabelMode === "value" ? fmtMoney(totalPay) : `${opts.totalLabelText || "Total paid"}: ${fmtMoney(totalPay)}`}
        </div>
      </div>
    </div>
  );
}
