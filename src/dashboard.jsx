// src/Dashboard.jsx
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AuthCtx, useTheme } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listHunts } from "@/lib/hunts";
import { supabase } from "@/lib/supabase";
import { Eye, Trophy, BarChart2, Calculator, Hash, Star, Lock } from "lucide-react";

/* ---------------- utils ---------------- */
const cn = (...c) => c.filter(Boolean).join(" ");
const clamp = (n) => (Number.isFinite(+n) ? +n : 0);
const money = (n, cur = "€") =>
  `${cur} ${Number(clamp(n)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/* helpers para apanhar o 1º valor string válido */
const pickStr = (row, keys) => {
  for (const k of keys) {
    const v = row?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
};
const pickImg = (row, keys) => {
  for (const k of keys) {
    const v = row?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
};

/* -------- catálogo: slots_catalog (id -> meta) -------- */
async function fetchSlotMetaFromCatalog(ids) {
  if (!ids.length) return new Map();
  const idList = [...new Set(ids.map((x) => String(x)))];
  const { data, error } = await supabase.from("slots_catalog").select("*").in("id", idList);
  if (error || !Array.isArray(data)) return new Map();

  const map = new Map();
  for (const row of data) {
    if (row?.id == null) continue;
    const name = pickStr(row, ["NAME", "name", "title", "game_name", "display_name"]) || "Slot";
    const provider = pickStr(row, ["PROVIDER", "provider", "vendor", "studio", "maker", "provider_name"]);
    const img =
      pickImg(row, [
        "THUMBNAIL",
        "THUMBNAIL_URL",
        "thumbnail",
        "thumbnail_url",
        "thumb",
        "thumb_url",
        "IMAGE_URL",
        "image_url",
        "IMAGE",
        "image",
        "logo",
        "icon",
        "cover",
        "img",
        "img_url",
      ]) || null;
    map.set(String(row.id), { name, provider, img });
  }
  return map;
}

/* -------- helper de ordenação persistida -------- */
function ordVal(r) {
  const o = r?.order_index ?? r?.order ?? r?.position ?? r?.sort ?? r?.order_idx;
  if (Number.isFinite(Number(o))) return Number(o);
  const t = new Date(r?.created_at || r?.createdAt || r?.timestamp || 0).getTime();
  return (Number.isFinite(t) ? t : 0) || (Number(r?.id) || 0);
}

/* ---------------- carregar rondas do último hunt ---------------- */
async function loadBonusesForHunt(hunt) {
  if (!hunt) return [];
  const tryFetch = async (col, val) => {
    const { data, error } = await supabase.from("hunt_slots").select("*").eq(col, val);
    if (!error && Array.isArray(data)) return data;
    return [];
  };
  let rows = await tryFetch("hunt_number_id", hunt.number_id);
  if (!rows.length) rows = await tryFetch("hunt_id", hunt.id);
  if (!rows.length) return [];

  // ordenar como no hunt-detail
  rows.sort((a, b) => ordVal(a) - ordVal(b));

  const slotIds = [...new Set(rows.map((r) => r?.slot_id).filter((x) => x != null))];
  const metaMap = await fetchSlotMetaFromCatalog(slotIds);

  return rows.map((r) => {
    const slotId = r?.slot_id ?? r?.slot ?? null;
    const payout = Number(r?.payout ?? r?.pay ?? r?.win ?? r?.amount ?? 0) || 0;
    const bet = Number(r?.betsize ?? r?.bet_size ?? r?.bet ?? r?.stake ?? 0) || 0;
    const multi = Number(r?.multiplier ?? (bet > 0 ? payout / bet : 0)) || 0;
    const meta = slotId != null ? metaMap.get(String(slotId)) : null;

    return {
      slotId,
      huntNumberId: r?.hunt_number_id ?? r?.hunt_id ?? null,
      name: meta?.name || r?.slot_name || (slotId != null ? String(slotId) : "Slot"),
      provider: meta?.provider || "",
      img: meta?.img || null,
      payout,
      bet,
      multi,
      isSuper: !!r?.is_super,
    };
  });
}

/* -------- carregar TODAS as rondas (lifetime) -------- */
async function loadAllBonusesForUser(hunts) {
  if (!Array.isArray(hunts) || !hunts.length) return [];

  const numberIds = [...new Set(hunts.map((h) => h.number_id).filter(Boolean))];
  const huntIds = [...new Set(hunts.map((h) => h.id).filter(Boolean))];

  let rows = [];
  if (numberIds.length) {
    const { data, error } = await supabase.from("hunt_slots").select("*").in("hunt_number_id", numberIds);
    if (!error && Array.isArray(data)) rows = data;
  }
  if (!rows.length && huntIds.length) {
    const { data, error } = await supabase.from("hunt_slots").select("*").in("hunt_id", huntIds);
    if (!error && Array.isArray(data)) rows = data;
  }
  if (!rows.length) return [];

  // mesma ordenação persistida
  rows.sort((a, b) => ordVal(a) - ordVal(b));

  const slotIds = [...new Set(rows.map((r) => r?.slot_id).filter((x) => x != null))];
  const metaMap = await fetchSlotMetaFromCatalog(slotIds);

  return rows.map((r) => {
    const slotId = r?.slot_id ?? r?.slot ?? null;
    const payout = Number(r?.payout ?? r?.pay ?? r?.win ?? r?.amount ?? 0) || 0;
    const bet = Number(r?.betsize ?? r?.bet_size ?? r?.bet ?? r?.stake ?? 0) || 0;
    const multi = Number(r?.multiplier ?? (bet > 0 ? payout / bet : 0)) || 0;
    const meta = slotId != null ? metaMap.get(String(slotId)) : null;

    return {
      slotId,
      huntNumberId: r?.hunt_number_id ?? r?.hunt_id ?? null,
      name: meta?.name || r?.slot_name || (slotId != null ? String(slotId) : "Slot"),
      provider: meta?.provider || "",
      img: meta?.img || null,
      payout,
      bet,
      multi,
      isSuper: !!r?.is_super,
    };
  });
}

/* ---------------- Bézier smoothing util ---------------- */
function smoothPathFromPoints(pts, tension = 1) {
  if (pts.length <= 1) return "";
  if (pts.length === 2) return `M ${pts[0][0]},${pts[0][1]} L ${pts[1][0]},${pts[1][1]}`;
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension;
    const cp1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension;
    const cp2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension;
    const cp2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/* ---------------- Chart ---------------- */
function LastHuntBonusesChart({ bonuses = [], autoStepMs = 6000, onOpen }) {
  const { isDark } = useTheme();
  const boxRef = useRef(null);
  const [W, setW] = useState(760);
  const H = 300;
  const [gradId] = useState(() => "g" + Math.random().toString(36).slice(2, 8));

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setW(Math.max(560, el.clientWidth)));
    obs.observe(el);
    setW(Math.max(560, el.clientWidth));
    return () => obs.disconnect();
  }, []);

  const rows = (bonuses || []).map((b) => ({
    ...b,
    name: String(b.name || "Slot"),
    payout: clamp(b.payout),
    multi: clamp(b.multi),
  }));

  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [rows.length]);
  useEffect(() => {
    if (!rows.length) return;
    const t = setInterval(() => setActive((i) => (i + 1) % rows.length), autoStepMs);
    return () => clearInterval(t);
  }, [rows.length, autoStepMs]);

  if (!rows.length) {
    return (
      <div ref={boxRef} className="h-[300px] relative grid place-items-center text-sm">
        No bonus data for the last hunt.
      </div>
    );
  }

  const padX = 44,
    padY = 28;
  const innerW = W - padX * 2,
    innerH = H - padY * 2;

  const maxPayout = Math.max(...rows.map((r) => r.payout), 1);
  const maxMulti = Math.max(...rows.map((r) => r.multi), 1);

  const x = (i) => padX + (i / Math.max(1, rows.length - 1)) * innerW;
  const yPayout = (v) => padY + innerH - (v / maxPayout) * innerH;
  const yMulti = (v) => padY + innerH - (v / maxMulti) * innerH;

  const ptsPay = rows.map((r, i) => [x(i), yPayout(r.payout)]);
  const ptsMul = rows.map((r, i) => [x(i), yMulti(r.multi)]);

  const payoutPath = smoothPathFromPoints(ptsPay, 1);
  const multiPath = smoothPathFromPoints(ptsMul, 1);

  const firstX = x(0);
  const lastX = x(rows.length - 1);
  const payoutArea = `${payoutPath} L ${lastX},${H - padY} L ${firstX},${H - padY} Z`;

  const activeRow = rows[active];

  const maxLabels = Math.max(1, Math.floor(innerW / 70));
  const step = Math.max(1, Math.ceil(rows.length / maxLabels));

  return (
    <div ref={boxRef} className="relative">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id={`${gradId}-pay`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isDark ? "#38bdf8" : "#0ea5e9"} stopOpacity="0.25" />
            <stop offset="100%" stopColor={isDark ? "#38bdf8" : "#0ea5e9"} stopOpacity="0.04" />
          </linearGradient>
        </defs>

        <line x1={padX} y1={H - padY} x2={W - padX} y2={H - padY} stroke={isDark ? "#2f2f2f" : "#e5e5e5"} />
        <line x1={padX} y1={padY} x2={padX} y2={H - padY} stroke={isDark ? "#2f2f2f" : "#e5e5e5"} />

        <path d={payoutArea} fill={`url(#${gradId}-pay)`} />
        <path d={payoutPath} fill="none" stroke={isDark ? "#38bdf8" : "#0ea5e9"} strokeWidth="2" />
        <path d={multiPath} fill="none" stroke={isDark ? "#a78bfa" : "#7c3aed"} strokeWidth="1.8" strokeDasharray="5 5" />

        <circle cx={x(active)} cy={yPayout(activeRow.payout)} r="6" fill="none" stroke="#f472b6" strokeWidth="2" />

        {rows.map((r, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={yPayout(r.payout)} r="3.2" fill="#e11d48" />
            {(i % step === 0 || i === rows.length - 1) && (
              <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill={isDark ? "#bdbdbd" : "#666"}>
                #{i + 1}
              </text>
            )}
          </g>
        ))}
      </svg>

      <div className="px-1 pb-2 text-xs flex gap-4">
        <div className="inline-flex items-center gap-2">
          <span className="inline-block w-3 h-[2px] bg-sky-500" />
          Winnings (€)
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="inline-block w-3 h-[2px] bg-violet-500" />
          Multi (×)
        </div>
      </div>

      <TooltipSimple
        x={x(active)}
        y={yPayout(activeRow.payout)}
        name={activeRow.name}
        payout={activeRow.payout}
        multi={activeRow.multi}
        isSuper={!!activeRow.isSuper}
        dark={isDark}
        onOpen={onOpen}
      />
    </div>
  );
}

/* Tooltip */
function TooltipSimple({ x, y, name, payout, multi, isSuper, dark }) {
  const BOX_W = 360;
  const BOX_H = 74;
  const [pos, setPos] = useState({ left: x, top: y });
  useEffect(() => setPos({ left: x, top: y }), [x, y]);
  const left = Math.max(8, pos.left - BOX_W - 12);
  const top = Math.max(8, pos.top - BOX_H - 6);

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: BOX_W,
        height: BOX_H,
        transition: "left 650ms ease, top 650ms ease",
        pointerEvents: "none",
      }}
    >
      <div
        className={cn(
          "rounded-xl border px-3 py-2 flex items-center justify-between gap-3",
          dark ? "bg-white/5 border-white/10" : "bg-white/80 border-zinc-200 shadow-sm"
        )}
        style={{ pointerEvents: "auto" }}
      >
        <div className="min-w-0 flex items-center gap-2">
          <span className="truncate font-medium">{name || "—"}</span>
          {isSuper && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border",
                dark ? "border-pink-300/40 text-pink-200 bg-pink-500/10"
                     : "border-pink-600/30 text-pink-700 bg-pink-500/10"
              )}
            >
              <Star className="h-3.5 w-3.5" />
              SUPER
            </span>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-6 text-sm">
          <div className="text-left">
            <div className={dark ? "text-white/60 text-[11px]" : "text-zinc-500 text-[11px]"}>Earning</div>
            <div>{money(payout)}</div>
          </div>
          <div className="text-left">
            <div className={dark ? "text-white/60 text-[11px]" : "text-zinc-500 text-[11px]"}>Multiplier</div>
            <div>{`x${Number(multi ?? 0).toFixed(2)}`}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Accent wrapper ---------------- */
function AccentCard({ title, children }) {
  const { isDark } = useTheme();
  return (
    <Card className={cn("relative rounded-xl overflow-hidden", isDark ? "bg-white/5 border-white/10" : "bg-white border-zinc-200")}>
      <div className="absolute inset-x-0 top-0 h-[2px] bg-sky-500/70 shadow-[0_0_12px_2px_rgba(56,189,248,0.35)]" />
      {title && (
        <CardHeader className="px-4 pt-4 pb-1">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="px-4 pb-4">{children}</CardContent>
    </Card>
  );
}

/* ---------------- Simple stat ---------------- */
/* --------- Mantém em 1 linha e auto-reduz para caber --------- */
function FitText({ children, className, minScale = 0.7 }) {
  const boxRef = React.useRef(null);
  const innerRef = React.useRef(null);
  const [scale, setScale] = React.useState(1);

  const recalc = React.useCallback(() => {
    const box = boxRef.current, inner = innerRef.current;
    if (!box || !inner) return;
    const w = box.clientWidth - 2;       // margem de segurança
    const iw = inner.scrollWidth || 1;
    const s = Math.min(1, Math.max(minScale, w / iw));
    setScale(s);
  }, [minScale]);

  React.useEffect(() => {
    recalc();
    const ro = new ResizeObserver(recalc);
    if (boxRef.current) ro.observe(boxRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, [recalc]);

  return (
    <div ref={boxRef} className={cn("overflow-hidden", className)} style={{ lineHeight: 1 }}>
      <span
        ref={innerRef}
        className="inline-block whitespace-nowrap origin-left"
        style={{ transform: `scale(${scale})`, transformOrigin: "left center" }}
      >
        {children}
      </span>
    </div>
  );
}

function SimpleStat({ title, value, icon: Icon, tone, nowrap = false }) {
  const { isDark } = useTheme();
  const valueCls = cn(
    "mt-1 font-semibold tabular-nums",
    tone === "good" ? "text-emerald-500" :
    tone === "bad"  ? "text-rose-500" :
    (isDark ? "text-white" : "text-zinc-900")
  );

  return (
    <AccentCard>
      <div className="flex items-center justify-between py-2">
        <div className={cn("text-xs", isDark ? "text-white/70" : "text-zinc-600")}>{title}</div>
        {Icon && <Icon className="h-4 w-4 text-sky-400" />}
      </div>

      {nowrap ? (
        <FitText className={valueCls}>
          {value}
        </FitText>
      ) : (
        <div className={valueCls}>{value}</div>
      )}
    </AccentCard>
  );
}

/* ---------------- Row de slot ---------------- */
function SlotRow({ img, name, provider, right }) {
  const { isDark } = useTheme();
  const [broken, setBroken] = React.useState(false);

  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {img && !broken ? (
          <img src={img} alt={name} className="h-10 w-10 rounded-md object-cover" onError={() => setBroken(true)} />
        ) : (
          <div className="h-10 w-10 rounded-md grid place-items-center bg-gradient-to-br from-sky-600/30 to-violet-600/30 text-white/80 text-xs">
            {name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-medium truncate">{name}</div>
          <div className={cn("text-[11px] truncate", isDark ? "text-white/50" : "text-zinc-500")}>{provider || "—"}</div>
        </div>
      </div>
      <div className="tabular-nums text-sm">{right}</div>
    </li>
  );
}

/* ---------------- Tabela P/L ---------------- */
function PLHistoryTable({ rows = [], currency = "€", onOpen }) {
  const { isDark } = useTheme();

  const tonePL = (v) =>
    v >= 0
      ? isDark ? "text-emerald-300" : "text-emerald-600"
      : isDark ? "text-rose-300" : "text-rose-600";

  return (
    <AccentCard title="Last 3 Hunts (P/L)">
      <div className="overflow-x-auto">
        <table className="w-full text-sm rounded-lg overflow-hidden">
          <thead className={cn(
            isDark ? "bg-white/10 text-white/70" : "bg-zinc-100 text-zinc-700"
          )}>
            <tr>
              <th className="text-left px-4 py-2 font-medium">Hunt</th>
              <th className="text-left px-4 py-2 font-medium">Cost</th>
              <th className="text-left px-4 py-2 font-medium">Winnings</th>
              <th className="text-left px-4 py-2 font-medium">P/L</th>
              <th className="px-4 py-2 text-right w-[1%]" />
            </tr>
          </thead>

          <tbody>
            {rows.slice(0, 3).map((r) => (
              <tr
                key={r.id}
                className={cn(
                  "transition-colors",
                  isDark
                    ? "border-b border-white/10 hover:bg-white/[0.04]"
                    : "border-b border-zinc-200 hover:bg-zinc-50"
                )}
              >
                <td className="px-4 py-2">{r.title}</td>
                <td className="px-4 py-2">{money(r.start_cost, currency)}</td>
                <td className="px-4 py-2">{money(r.winnings, currency)}</td>
                <td className={cn("px-4 py-2 font-medium", tonePL(r.pl))}>
                  {money(r.pl, currency)}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => onOpen?.(r)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm",
                      isDark ? "text-sky-200 hover:bg-white/5" : "text-sky-800 hover:bg-sky-50"
                    )}
                    title="Open"
                  >
                    <Eye className="h-4 w-4" /> Open
                  </button>
                </td>
              </tr>
            ))}

            {!rows.length && (
              <tr>
                <td className="px-4 py-6 text-center text-sm opacity-70" colSpan={5}>
                  No hunts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AccentCard>
  );
}

/* ---------- BLOQUEIO TOTAL (Free) ---------- */
function BlockCard({ height }) {
  const { isDark } = useTheme();
  return (
    <div
      className={cn(
        "rounded-xl border grid place-items-center",
        isDark ? "bg-neutral-900/95 border-white/10" : "bg-zinc-100 border-zinc-200",
        height
      )}
    >
      <div className="flex items-center gap-2 text-sm opacity-80">
        <Lock className="h-4 w-4" />
        Available on Plus.
      </div>
    </div>
  );
}
function DashboardLocked() {
  const { isDark } = useTheme();
  return (
    <section className="py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div
          className={cn(
            "mb-4 rounded-xl border px-3 py-2 text-sm flex items-center gap-2",
            isDark ? "bg-zinc-900/90 border-white/10" : "bg-white border-zinc-200"
          )}
        >
          <Lock className="h-4 w-4 opacity-80" />
          Dashboard available only on Plus. Upgrade to unlock.
        </div>

        <BlockCard height="h-[320px]" />

        <div className="grid md:grid-cols-6 gap-3 my-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <BlockCard key={i} height="h-[96px]" />
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <BlockCard height="h-[180px]" />
          <BlockCard height="h-[180px]" />
        </div>

        <BlockCard height="h-[140px]" />
      </div>
    </section>
  );
}

/* ---------- SKELETON (pago) ---------- */
function DashboardLoading() {
  const { isDark } = useTheme();
  const box = (...c) => cn("rounded-xl border animate-pulse", isDark ? "bg-white/5 border-white/10" : "bg-zinc-100 border-zinc-200", ...c);
  const Line = ({ w = "60%" }) => <div className="h-3 rounded bg-white/10 my-1" style={{ width: w }} />;

  return (
    <section className="py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-4">
        <div className={box("h-[320px]")} />
        <div className="grid md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={box("p-4")}>
              <Line w="40%" />
              <Line w="70%" />
            </div>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className={box("p-4")}>
              <Line w="85%" />
              <Line w="65%" />
              <Line w="75%" />
              <Line w="55%" />
            </div>
          ))}
        </div>
        <div className={box("p-4")}>
          <Line w="95%" />
          <Line w="88%" />
          <Line w="92%" />
          <Line w="70%" />
        </div>
      </div>
    </section>
  );
}

/* ===================== WRAPPER (evita erro de hooks) ===================== */
export default function Dashboard() {
  const { profile } = useContext(AuthCtx) || {};
  const isFree = String(profile?.plan || "Free").toLowerCase() === "free";
  return isFree ? <DashboardLocked /> : <DashboardPlus />;
}

/* ===================== DASHBOARD (pago) ===================== */
function DashboardPlus() {
  const [hunts, setHunts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastBonuses, setLastBonuses] = useState([]);
  const [allBonuses, setAllBonuses] = useState([]);
  const currency = "€";

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { hunts } = await listHunts({ page: 1, pageSize: 500 });
        if (alive) setHunts(hunts || []);
      } catch {
        if (alive) setHunts([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const lastHunt = useMemo(() => {
    if (!hunts.length) return null;
    return [...hunts].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
  }, [hunts]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!lastHunt) return setLastBonuses([]);
      try {
        const arr = await loadBonusesForHunt(lastHunt);
        if (alive) setLastBonuses(Array.isArray(arr) ? arr : []);
      } catch {
        if (alive) setLastBonuses([]);
      }
    })();
    return () => { alive = false; };
  }, [lastHunt]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!hunts.length) return setAllBonuses([]);
      try {
        const arr = await loadAllBonusesForUser(hunts);
        if (alive) setAllBonuses(Array.isArray(arr) ? arr : []);
      } catch {
        if (alive) setAllBonuses([]);
      }
    })();
    return () => { alive = false; };
  }, [hunts]);

  const aggr = useMemo(() => {
    const totalCost = hunts.reduce((s, h) => s + clamp(h.start_cost), 0);
    const totalEarnings = allBonuses.reduce((s, r) => s + clamp(r.payout), 0);
    const pl  = totalEarnings - totalCost;
    const roi = totalCost > 0 ? (pl / totalCost) * 100 : 0;

    const bonusCount = allBonuses.length;
    const avgBet = bonusCount ? allBonuses.reduce((a, r) => a + clamp(r.bet), 0) / bonusCount : 0;
    const avgX   = bonusCount ? allBonuses.reduce((a, r) => a + clamp(r.multi), 0) / bonusCount : 0;

    let best = { payout: 0, multi: 0, name: "-" };
    for (const r of allBonuses) if (r.payout > best.payout) best = { payout: r.payout, multi: r.multi, name: r.name || "-" };

    const metaBySlot = new Map();
    for (const r of allBonuses) {
      const key = r.slotId != null ? String(r.slotId) : null;
      if (key && !metaBySlot.has(key)) metaBySlot.set(key, { name: r.name, provider: r.provider, img: r.img });
    }
    const bestBySlot = new Map();
    for (const r of allBonuses) {
      const key = r.slotId != null ? String(r.slotId) : null;
      if (!key) continue;
      const cur = bestBySlot.get(key) || 0;
      if (r.payout > cur) bestBySlot.set(key, r.payout);
    }
    const topByE = [...bestBySlot.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([slotId, val]) => ({ slotId, val, ...(metaBySlot.get(slotId) || { name: "Slot", provider: "", img: null }) }));

    const bestXBySlot = new Map();
    for (const r of allBonuses) {
      const key = r.slotId != null ? String(r.slotId) : null;
      if (!key) continue;
      const cur = bestXBySlot.get(key) || 0;
      if (r.multi > cur) bestXBySlot.set(key, r.multi);
    }
    const topByX = [...bestXBySlot.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([slotId, val]) => ({ slotId, val, ...(metaBySlot.get(slotId) || { name: "Slot", provider: "", img: null }) }));

    // soma de payouts por hunt_number_id para P/L correto
    const winsByHunt = new Map();
    for (const r of allBonuses) {
      const key = r.huntNumberId != null ? String(r.huntNumberId) : null;
      if (!key) continue;
      winsByHunt.set(key, (winsByHunt.get(key) || 0) + clamp(r.payout));
    }

    const plRows = [...hunts]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .map((h) => {
        const cost = clamp(h.start_cost);
        const calc = winsByHunt.get(String(h.number_id));
        const win  = Number.isFinite(calc) ? clamp(calc) : clamp(h.winnings);
        return {
          id: h.number_id ?? h.id,
          title: h.title,
          start_cost: cost,
          winnings: win,
          pl: win - cost,
        };
      });

    return {
      kpis: { totalCost, winnings: totalEarnings, pl, roi, avgBet, best, bonusCount, avgX },
      topByE, topByX, plRows,
    };
  }, [hunts, allBonuses]);

  if (loading) return <DashboardLoading />;

  return (
    <section className="py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-4">
        <AccentCard title="Last Hunt — Winnings & Multis">
          <LastHuntBonusesChart bonuses={lastBonuses} />
        </AccentCard>

        <div className="grid md:grid-cols-6 gap-3 mb-4 mt-4">
          <SimpleStat  title="Total ROI (ever)" value={`${aggr.kpis.roi.toFixed(1)}%`} icon={BarChart2} tone={aggr.kpis.roi >= 100 ? "good" : "bad"}/>
          <SimpleStat title="Total cost (ever)" value={money(aggr.kpis.totalCost, currency)} icon={Calculator} />
          <SimpleStat title="Avg bet (ever)" value={money(aggr.kpis.avgBet, currency)} icon={Hash} />
        <SimpleStat title="Best win (ever)" nowrap value={<><span>{money(aggr.kpis.best.payout, currency)}</span><span className="ml-2">x{aggr.kpis.best.multi.toFixed(1)}</span></>}icon={Trophy}/>
          <SimpleStat title="Bonuses opened (ever)" value={aggr.kpis.bonusCount} icon={Hash} />
          <SimpleStat title="Avg multiplier (ever)" value={`x${aggr.kpis.avgX.toFixed(2)}`} icon={BarChart2} tone={aggr.kpis.avgX > 100 ? "good" : "bad"}/>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <AccentCard title="Top payouts (ever)">
            <ul className="text-sm space-y-3">
              {aggr.topByE.map((r) => (
                <SlotRow key={r.slotId} img={r.img} name={r.name} provider={r.provider} right={money(r.val, currency)} />
              ))}
              {!aggr.topByE.length && <li className="text-xs opacity-70">No data.</li>}
            </ul>
          </AccentCard>

          <AccentCard title="Top multipliers (ever)">
            <ul className="text-sm space-y-3">
              {aggr.topByX.map((r) => (
                <SlotRow key={r.slotId} img={r.img} name={r.name} provider={r.provider} right={`x${Number(r.val).toFixed(1)}`} />
              ))}
              {!aggr.topByX.length && <li className="text-xs opacity-70">No data.</li>}
            </ul>
          </AccentCard>
        </div>

        <PLHistoryTable
          rows={aggr.plRows}
          currency={currency}
          onOpen={(r) => {
            const base = `${window.location.origin}${window.location.pathname}`;
            const url = `${base}#/hunts/${r.id}`;
            window.open(url, "_blank", "noopener,noreferrer");
          }}
        />
      </div>
    </section>
  );
}
