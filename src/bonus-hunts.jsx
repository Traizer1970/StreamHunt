// /src/bonus-hunts.jsx
import React, { useEffect, useMemo, useState } from "react";
import { AuthCtx, useTheme } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  BarChart2,
  MousePointerClick,
  Hash,
  Calculator,
  DollarSign,
  Lock,
  Loader2,
} from "lucide-react";
import { listHunts, createHunt, deleteHunt, updateHunt } from "@/lib/hunts";
import { listHuntSlots } from "@/lib/slots";
import { cn as _cn } from "@/lib/utils";

/* ---------------- small utils ---------------- */
const cn = (...c) => (_cn ? _cn(...c) : c.filter(Boolean).join(" "));
const LOCALE = "en-GB";
const CURRENCY = "EUR";
const numCls = "tabular-nums whitespace-nowrap";
const SortIcon = ({ dir }) => (dir === "asc" ? <ChevronUp className="ml-1 h-3.5 w-3.5" /> : <ChevronDown className="ml-1 h-3.5 w-3.5" />);

const fmtMoney = (n) =>
  Number.isFinite(Number(n))
    ? new Intl.NumberFormat(LOCALE, {
        style: "currency",
        currency: CURRENCY,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(n))
    : "—";
const fmtX = (n) => (Number.isFinite(n) ? new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }).format(n) + "x" : "—");
function renderPL(v) {
  const n = Number(v) || 0;
  const ok = n >= 0;
  const s = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));
  return { text: `${ok ? "" : "−"}€${s}`, positive: ok };
}

/* ---------------- Accent card/box ---------------- */
function AccentCard({ title, children, className }) {
  const { isDark } = useTheme();
  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden",
        isDark ? "bg-white/5 border border-white/10" : "bg-white border border-zinc-200",
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-sky-500/70 shadow-[0_0_12px_2px_rgba(56,189,248,0.35)]" />
      {title && <div className="px-4 pt-4 pb-1 text-xs opacity-80">{title}</div>}
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}
function SimpleStat({ title, value, icon: Icon }) {
  const { isDark } = useTheme();
  return (
    <AccentCard>
      <div className="flex items-center justify-between py-2">
        <div className={cn("text-xs", isDark ? "text-white/70" : "text-zinc-600")}>{title}</div>
        {Icon && <Icon className="h-4 w-4 text-sky-400" />}
      </div>
      <div className={cn("mt-1 font-semibold", numCls)}>{value}</div>
    </AccentCard>
  );
}
function AccentBox({ children, className }) {
  const { isDark } = useTheme();
  return (
    <div
      className={cn(
        "relative rounded-xl",
        isDark ? "bg-white/5 border border-white/10" : "bg-white border border-zinc-200",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-sky-500/70 shadow-[0_0_12px_2px_rgba(56,189,248,0.35)]" />
      </div>
      {children}
    </div>
  );
}

/* ---------------- tips ---------------- */
function Tip({ content, children, className }) {
  return (
    <span className={cn("relative inline-flex items-center group", className)}>
      {children}
      <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-50 hidden group-hover:block">
        <div className="rounded-xl border border-white/10 bg-zinc-900/95 shadow-xl px-3 py-2 max-w-[280px]">{content}</div>
        <div className="mx-auto -mt-1 h-2 w-2 rotate-45 bg-zinc-900/95 border-l border-t border-white/10" />
      </span>
    </span>
  );
}
function PrettyTip({ title, subtitle }) {
  return (
    <div className="min-w-[190px]">
      <div className="text-[10px] uppercase tracking-wide text-white/50">Info</div>
      <div className="mt-0.5 text-sm font-medium text-white">{title}</div>
      {subtitle && (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-white/60">
          <MousePointerClick className="h-3.5 w-3.5" /> {subtitle}
        </div>
      )}
    </div>
  );
}

/* ---------------- Aggregation helpers ---------------- */
function aggregateSlotRows(rows) {
  const map = new Map();
  for (const r of rows) {
    const name = r?.name || r?.title || "Unknown";
    const image = r?.thumbnail || r?.image || null;
    const bet = Number(r?.bet_size) || 0;
    const win = Number(r?.payout) || 0;
    let x = Number(r?.multiplier);
    if (!Number.isFinite(x) && bet > 0) x = win / bet;

    if (!map.has(name)) {
      map.set(name, {
        name,
        image,
        plays: 0,
        bestPayment: 0,
        bestPaymentHunt: null,
        bestX: 0,
        bestXHunt: null,
      });
    }
    const s = map.get(name);
    s.plays += 1;

    if (win > s.bestPayment) {
      s.bestPayment = win;
      s.bestPaymentHunt = { number_id: r._huntNumber, title: r._huntTitle };
    }
    if (Number.isFinite(x) && x > s.bestX) {
      s.bestX = x;
      s.bestXHunt = { number_id: r._huntNumber, title: r._huntTitle };
    }
    if (!s.image && image) s.image = image;
  }
  return [...map.values()];
}

/* ---------------- Stats panes (only for PLUS) ---------------- */
function SlotsPane({ slotStats, slotBusy, onGoToHunt }) {
  const top5 = useMemo(
    () => [...(slotStats || [])].sort((a, b) => b.plays - a.plays || b.bestX - a.bestX).slice(0, 5),
    [slotStats]
  );

  if (slotBusy) {
    return (
      <div className="px-4 pb-6">
        <div className="flex items-center gap-2 text-sm opacity-80 px-3 py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading slot statistics…
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6">
      {top5.length === 0 ? (
        <div className="px-3 py-10 text-sm opacity-70">No slot data.</div>
      ) : (
        <>
          <div className="px-3 pb-2 text-sm font-semibold opacity-80">Top 5 slots (all-time)</div>

          <div className="grid grid-cols-12 text-sm font-semibold px-3 py-2">
            <div className="col-span-6">Slot</div>
            <div className="col-span-2 text-center">Played</div>
            <div className="col-span-2 text-center">Best Payment</div>
            <div className="col-span-2 text-center">Best X</div>
          </div>

          <div className="space-y-2">
            {top5.map((r, i) => {
              const tipPayment = r.bestPaymentHunt ? `Hunt #${r.bestPaymentHunt.number_id} — ${r.bestPaymentHunt.title || ""}` : null;
              const tipMulti = r.bestXHunt ? `Hunt #${r.bestXHunt.number_id} — ${r.bestXHunt.title || ""}` : null;

              return (
                <div key={r.name} className="grid grid-cols-12 items-center rounded-xl bg-white/[0.03] hover:bg-white/10 transition px-3 py-3">
                  <div className="col-span-6 flex items-center gap-3 min-w-0">
                    <div className="w-8 text-right text-sm font-bold opacity-70">#{i + 1}</div>
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
                      {r.image ? <img src={r.image} alt={r.name} className="w-full h-full object-cover" /> : <span className="text-[11px] font-bold opacity-80">{r.name.slice(0, 2).toUpperCase()}</span>}
                    </div>
                    <div className="truncate font-medium">{r.name}</div>
                  </div>

                  <div className={cn("col-span-2 text-center", numCls)}>{r.plays}</div>

                  <div className="col-span-2 text-center">
                    <Tip content={<PrettyTip title={tipPayment || "No record"} subtitle={tipPayment ? "Click to open" : ""} />}>
                      <button
                        disabled={!r.bestPaymentHunt}
                        onClick={() => r.bestPaymentHunt && onGoToHunt(r.bestPaymentHunt.number_id)}
                        className={cn(
                          "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ring-1",
                          r.bestPaymentHunt ? "ring-amber-400/40 text-amber-300 hover:bg-amber-400/10" : "opacity-60 cursor-not-allowed",
                          numCls
                        )}
                      >
                        {fmtMoney(r.bestPayment)}
                      </button>
                    </Tip>
                  </div>

                  <div className="col-span-2 text-center">
                    <Tip content={<PrettyTip title={tipMulti || "No record"} subtitle={tipMulti ? "Click to open" : ""} />}>
                      <button
                        disabled={!r.bestXHunt}
                        onClick={() => r.bestXHunt && onGoToHunt(r.bestXHunt.number_id)}
                        className={cn(
                          "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ring-1",
                          r.bestXHunt ? "ring-cyan-400/40 text-cyan-300 hover:bg-cyan-400/10" : "opacity-60 cursor-not-allowed",
                          numCls
                        )}
                      >
                        {fmtX(r.bestX)}
                      </button>
                    </Tip>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function TopHuntsPane({ hunts, winsByHunt, userNoByNumberId, onGoToHunt }) {
  const rows = useMemo(() => {
    return (hunts || []).map((h) => {
      const cost = Number(h.start_cost || 0);
      const winCalc = winsByHunt?.get(h.number_id);
      const win = Number.isFinite(winCalc) ? winCalc : Number(h.winnings || 0);
      const pl = win - cost;
      const x = cost > 0 ? win / cost : Number.NaN;
      return { ...h, cost, win, pl, x };
    });
  }, [hunts, winsByHunt]);

  const top5 = useMemo(() => {
    return [...rows]
      .sort((a, b) => {
        const ax = Number.isFinite(a.x) ? a.x : -Infinity;
        const bx = Number.isFinite(b.x) ? b.x : -Infinity;
        return bx === ax ? b.pl - a.pl : bx - ax; // 1º por X, depois por P/L
      })
      .slice(0, 5);
  }, [rows]);

  const maxX = useMemo(() => {
    const vals = top5.map((h) => (Number.isFinite(h.x) ? h.x : 0));
    return Math.max(1, ...vals);
  }, [top5]);

  const medalCls = (i) =>
    i === 0
      ? "ring-amber-400/40 text-amber-300"
      : i === 1
      ? "ring-zinc-300/40 text-zinc-200"
      : i === 2
      ? "ring-orange-400/40 text-orange-300"
      : "ring-white/20 text-white/70";

  if (top5.length === 0) {
    return (
      <div className="px-4 pb-6">
        <div className="px-3 py-10 text-sm opacity-70">No hunts yet.</div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6">
      <div className="px-3 pb-2 text-sm font-semibold opacity-80">Top 5 hunts (all-time)</div>

      <div className="grid grid-cols-12 text-sm font-semibold px-3 py-2">
        <div className="col-span-6">Hunt</div>
        <div className="col-span-2 text-center">Cost</div>
        <div className="col-span-2 text-center">Winnings</div>
        <div className="col-span-1 text-center">P/L</div>
        <div className="col-span-1 text-center">X</div>
      </div>

      <div className="space-y-2">
        {top5.map((h, i) => {
          const userNo = userNoByNumberId.get(h.number_id) || "—";
          const plFmt = renderPL(h.pl);
          const xVal = Number.isFinite(h.x) ? h.x : 0;
          const xPct = Math.min(100, (xVal / maxX) * 100);

          return (
            <button
              key={h.id}
              onClick={() => onGoToHunt?.(h)}
              className="relative grid grid-cols-12 items-center rounded-xl bg-white/[0.03] hover:bg-white/10 transition px-3 py-3 w-full text-left"
            >
              {/* Col: Hunt + medal + progress */}
              <div className="col-span-6 min-w-0">
                <div className="flex items-center gap-3">
                  <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ring-1", medalCls(i))}>
                    #{i + 1}
                  </span>
                  <div className="truncate font-medium">
                    {h.title || `Hunt #${h.number_id ?? "—"}`} <span className="opacity-60"></span>
                  </div>
                </div>
                {/* mini progress: X relativo ao melhor */}
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-cyan-400/50" style={{ width: `${xPct}%` }} />
                </div>
              </div>

              {/* Col: Cost */}
              <div className={cn("col-span-2 text-center", numCls)}>{fmtMoney(h.cost)}</div>

              {/* Col: Winnings (chip dourado, igual ao 'Best Payment') */}
              <div className="col-span-2 text-center">
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-amber-400/40 text-amber-300", numCls)}>
                  {fmtMoney(h.win)}
                </span>
              </div>

              {/* Col: P/L (chip verde/vermelho) */}
              <div className="col-span-1 text-center">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1",
                    plFmt.positive ? "text-emerald-300 ring-emerald-400/30" : "text-rose-400 ring-rose-400/30",
                    numCls
                  )}
                >
                  {plFmt.text}
                </span>
              </div>

              {/* Col: X (chip ciano) */}
              <div className="col-span-1 text-center">
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-cyan-400/40 text-cyan-300", numCls)}>
                  {fmtX(h.x)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HuntsPane({ hunts, onView, userNoByNumberId, winsByHunt }) {
  const rows = hunts.map((h) => {
    const cost = Number(h.start_cost || 0);
    const winCalc = winsByHunt?.get(h.number_id);
    const win = Number.isFinite(winCalc) ? winCalc : Number(h.winnings || 0);
    const pl = win - cost;
    const x = cost > 0 ? win / cost : Number.NaN;
    return { ...h, cost, win, pl, x };
  });

  const sorted = [...rows].sort((a, b) => {
    const ax = Number.isFinite(a.x) ? a.x : -Infinity;
    const bx = Number.isFinite(b.x) ? b.x : -Infinity;
    return bx === ax ? b.pl - a.pl : bx - ax;
  });

  return (
    <div className="px-4 pb-4">
      {sorted.length === 0 ? (
        <div className="px-3 py-10 text-sm opacity-70">No hunts yet.</div>
      ) : (
        <>
          <div className="grid grid-cols-12 text-sm font-semibold px-3 py-2">
            <div className="col-span-1">No.</div>
            <div className="col-span-5">Title</div>
            <div className="col-span-2 text-center">Cost</div>
            <div className="col-span-2 text-center">Winnings</div>
            <div className="col-span-1 text-center">P/L</div>
            <div className="col-span-1 text-center">X</div>
          </div>

          <div className="max-h-[420px] overflow-auto pr-1 space-y-2">
            {sorted.map((h) => {
              const pl = renderPL(h.pl);
              const userNo = userNoByNumberId.get(h.number_id) || "—";
              return (
                <button
                  key={h.id}
                  onClick={() => onView?.(h)}
                  className="grid grid-cols-12 items-center rounded-xl bg-white/5 hover:bg-white/10 transition px-3 py-3 w-full text-left"
                >
                  <div className="col-span-1">{userNo}</div>
                  <div className="col-span-5 truncate font-medium">{h.title || `Hunt #${h.number_id ?? "—"}`}</div>
                  <div className={cn("col-span-2 text-center", numCls)}>{fmtMoney(h.cost)}</div>
                  <div className={cn("col-span-2 text-center", numCls)}>{fmtMoney(h.win)}</div>
                  <div className={cn("col-span-1 text-center", numCls, pl.positive ? "text-emerald-300" : "text-rose-400")}>{pl.text}</div>
                  <div className={cn("col-span-1 text-center", numCls)}>{fmtX(h.x)}</div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- LOCKED blocks (same look as DashboardLocked) ---------------- */
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

function HuntsLockedTop() {
  const { isDark } = useTheme();
  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-xl border px-3 py-2 text-sm flex items-center gap-2",
          isDark ? "bg-zinc-900/90 border-white/10" : "bg-white border-zinc-200"
        )}
      >
        <Lock className="h-4 w-4 opacity-80" />
        Statistics available only on Plus. Upgrade to unlock.
      </div>

      <div className="grid md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <BlockCard key={i} height="h-[96px]" />
        ))}
      </div>

      <BlockCard height="h-[420px]" />
    </div>
  );
}

/* ---------------------- Page ---------------------- */
export default function BonusHuntsPage() {
  const { profile } = React.useContext(AuthCtx) || {};
  const { isDark } = useTheme();

  const isFree = String(profile?.plan || "Free").toLowerCase() === "free";

  const [busy, setBusy] = useState(false);
  const [hunts, setHunts] = useState([]);

  const [slotBusy, setSlotBusy] = useState(false);
  const [slotStats, setSlotStats] = useState([]);
  const [slotAgg, setSlotAgg] = useState({ count: 0, avgX: 0, avgEarning: 0, totalEarning: 0 });
  const [winsByHunt, setWinsByHunt] = useState(new Map());
  const [statsView, setStatsView] = useState("slots"); // "slots" | "hunts"

  /* -------- search/sort/pagination -------- */
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "number_id", dir: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  /* -------- modals -------- */
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [startCost, setStartCost] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStartCost, setEditStartCost] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  function onView(h) {
    const numberId = h?.number_id ?? h?.numberId;
    if (!numberId) return;
    window.location.hash = `#/hunts/${numberId}`;
  }

  /* ---------- load hunts (+ slot details only on PLUS) ---------- */
async function refresh() {
  setBusy(true);
  try {
    const res = await listHunts({ page: 1, pageSize: 1000 });
    const list = res?.hunts ?? [];
    setHunts(list);

    if (!isFree) {
      // Plus: calcula tudo (wins, agregados e top slots)
      await buildSlotStats(list);
    } else {
      // Free: calcula APENAS o total ganho por hunt para o P/L da tabela
      await buildWinsOnly(list);
      setSlotAgg({ count: 0, avgX: 0, avgEarning: 0, totalEarning: 0 });
      setSlotStats([]);
    }
  } catch (e) {
    console.error(e);
    setErrorMsg(e.message || "Failed to load hunts.");
  } finally {
    setBusy(false);
  }
}

  async function buildSlotStats(list) {
    setSlotBusy(true);
    try {
      const titleByNumber = Object.fromEntries(list.map((h) => [h.number_id, h.title]));
      const reqs = list.map(async (h) => {
        try {
          const r = await listHuntSlots({ numberId: h.number_id });
          const rows = (r?.slots || []).map((s) => ({
            ...s,
            _huntNumber: h.number_id,
            _huntTitle: titleByNumber[h.number_id] || h.title,
          }));
          return rows;
        } catch {
          return [];
        }
      });
      const flat = (await Promise.all(reqs)).flat();

      let totalPayout = 0;
      let xSum = 0;
      let xCount = 0;
      const m = new Map();

      for (const s of flat) {
        const bet = Number(s?.bet_size) || 0;
        const pay = Number(s?.payout) || 0;
        totalPayout += pay;
        m.set(s._huntNumber, (m.get(s._huntNumber) || 0) + pay);

        let x = Number(s?.multiplier);
        if (!Number.isFinite(x) && bet > 0) x = pay / bet;
        if (Number.isFinite(x)) {
          xSum += x;
          xCount += 1;
        }
      }

      setWinsByHunt(m);

      const huntsWithSlots = m.size || 0;
      const count = flat.length; // nº de slots
      // média de earning por SLOT
      const avgEarningPerSlot = count ? totalPayout / count : 0;
      const avgX = xCount ? xSum / xCount : 0;
      setSlotAgg({ count, avgX, avgEarning: avgEarningPerSlot, totalEarning: totalPayout });

      setSlotStats(aggregateSlotRows(flat));
    } finally {
      setSlotBusy(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFree]);
// Soma apenas os payouts por hunt (sem estatísticas) — serve para o plano Free
async function buildWinsOnly(list) {
  try {
    const reqs = list.map(async (h) => {
      try {
        const r = await listHuntSlots({ numberId: h.number_id });
        const rows = r?.slots || [];
        const total = rows.reduce((sum, s) => sum + (Number(s?.payout) || 0), 0);
        return [h.number_id, total];
      } catch {
        return [h.number_id, 0];
      }
    });
    const entries = await Promise.all(reqs);
    setWinsByHunt(new Map(entries));
  } catch {
    setWinsByHunt(new Map());
  }
}

  /* ---------- filter/sort/paging ---------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return hunts;
    return hunts.filter(
      (h) => String(h.title ?? "").toLowerCase().includes(q) || String(h.number_id ?? "").toLowerCase().includes(q)
    );
  }, [hunts, query]);

  function getSortVal(h, key) {
    if (key === "pl") return (winsByHunt.get(h.number_id) ?? Number(h.winnings || 0)) - Number(h.start_cost || 0);
    return h?.[key] ?? "";
  }
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const { key, dir } = sort;
    arr.sort((a, b) => {
      const va = getSortVal(a, key);
      const vb = getSortVal(b, key);
      const bothNum = typeof va === "number" && typeof vb === "number";
      if (bothNum) return dir === "asc" ? va - vb : vb - va;
      return dir === "asc" ? String(va).localeCompare(String(vb), LOCALE) : String(vb).localeCompare(String(va), LOCALE);
    });
    return arr;
  }, [filtered, sort, winsByHunt]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  /* ---------- KPIs globais (só para PLUS) ---------- */
  const meta = useMemo(() => {
    const totalStart = hunts.reduce((s, h) => s + Number(h.start_cost || 0), 0);
    const huntsQty = hunts.length;
    const profit = slotAgg.totalEarning - totalStart;
    return { huntsQty, slotsQty: slotAgg.count, avgX: slotAgg.avgX, avgEarning: slotAgg.avgEarning, profit };
  }, [hunts, slotAgg]);

  /* ---------- mapping ---------- */
  const userNoByNumberId = useMemo(() => {
    const arr = [...hunts].sort(
      (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );
    const map = new Map();
    arr.forEach((h, i) => map.set(h.number_id, i + 1));
    return map;
  }, [hunts]);

  /* ---------- plan limits ---------- */
  const canCreate = !isFree || hunts.length < 1;

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  return (
    <section className="py-8 md:py-10">
      <div className="max-w-7xl mx-auto px-4">
        {!canCreate && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            Free plan allows only 1 hunt. Upgrade to create unlimited hunts.
          </div>
        )}

        {/* ---------------- TOP AREA: locked like Dashboard when FREE ---------------- */}
        {isFree ? (
          <HuntsLockedTop />
        ) : (
          <>
            {/* KPIs (PLUS) */}
            <div className="grid md:grid-cols-5 gap-3 mb-4">
              <SimpleStat title="Bonus Hunt Quantity" value={new Intl.NumberFormat(LOCALE).format(meta.huntsQty)} icon={Hash} />
              <SimpleStat title="Slots Quantity" value={new Intl.NumberFormat(LOCALE).format(meta.slotsQty)} icon={Hash} />
              <SimpleStat title="Average X" value={fmtX(meta.avgX)} icon={BarChart2} />
              <SimpleStat title="Average Earning / Slot" value={fmtMoney(meta.avgEarning)} icon={Calculator} />
              <SimpleStat
                title="Profit"
                value={<span className={cn(numCls, meta.profit >= 0 ? "text-emerald-300" : "text-rose-400")}>{fmtMoney(meta.profit)}</span>}
                icon={DollarSign}
              />
            </div>

            {/* Statistics (PLUS) */}
<AccentCard>
  <div className="flex items-center justify-between px-4 pt-4 pb-2">
     <div className="flex items-center gap-2">
       <BarChart2 className="h-6 w-6 text-sky-300" />
       <h3 className="text-3xl font-extrabold tracking-tight">Statistics</h3>
     </div>
     <Button
      variant="outline"
      size="sm"
      onClick={() => setStatsView(v => (v === "slots" ? "hunts" : "slots"))}
      className="px-3"
    >
      {statsView === "slots" ? "Show Top Hunts" : "Show Top Slots"}
    </Button>
   </div>
  {statsView === "slots" ? (
    <SlotsPane
      slotStats={slotStats}
      slotBusy={slotBusy}
      onGoToHunt={(numberId) => onView?.({ number_id: numberId })}
    />
  ) : (
    <TopHuntsPane
      hunts={hunts}
      winsByHunt={winsByHunt}
      userNoByNumberId={userNoByNumberId}
      onGoToHunt={(h) => onView?.(h)}
    />
  )}
</AccentCard>

          </>
        )}

        {/* ---------------- Header + actions ---------------- */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
          <h2 className="text-xl font-bold">Bonus Hunts</h2>
          <div className="flex flex-1 sm:flex-none items-center gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by title or No.…"
                className="pl-9"
              />
              {query && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 opacity-60 hover:opacity-90"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Create button with tooltip when blocked */}
            {canCreate ? (
              <Button onClick={() => setCreateOpen(true)} className="px-4 shrink-0">
                Create Bonus Hunt
              </Button>
            ) : (
              <Tip
                content={
                  <PrettyTip
                    title="Free plan allows only 1 hunt."
                    subtitle="Upgrade to create more hunts."
                  />
                }
              >
                <span className="inline-flex">
                  <Button disabled className="px-4 shrink-0 opacity-60 cursor-not-allowed">
                    Create Bonus Hunt
                  </Button>
                </span>
              </Tip>
            )}
          </div>
        </div>

        {/* ---------------- TABLE ---------------- */}
        <AccentBox>
          <div className="grid grid-cols-12 px-3 py-2 text-[12px] font-semibold bg-white/[0.06]">
            <button onClick={() => toggleSort("number_id")} className="col-span-1 text-left flex items-center">
              No. {sort.key === "number_id" && <SortIcon dir={sort.dir} />}
            </button>
            <button onClick={() => toggleSort("title")} className="col-span-5 text-left flex items-center">
              Title {sort.key === "title" && <SortIcon dir={sort.dir} />}
            </button>
            <button onClick={() => toggleSort("start_cost")} className="col-span-2 text-right flex items-center justify-end">
              Start {sort.key === "start_cost" && <SortIcon dir={sort.dir} />}
            </button>
            <button onClick={() => toggleSort("pl")} className="col-span-2 text-right flex items-center justify-end">
              P/L {sort.key === "pl" && <SortIcon dir={sort.dir} />}
            </button>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {!busy && (
            <div className="divide-y divide-white/10">
              {pageItems.map((h) => {
                const start = Number(h.start_cost || 0);
                const won = winsByHunt.get(h.number_id) ?? Number(h.winnings || 0);
                const pl = won - start;
                const plFmt = renderPL(pl);
                const userNo = userNoByNumberId.get(h.number_id) ?? "—";

                const deleteDisabled = isFree;

                const deleteBtn = (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!deleteDisabled) setDeleteTarget(h);
                    }}
                    disabled={deleteDisabled}
                    className={cn("h-8 w-8 text-white", deleteDisabled && "cursor-not-allowed opacity-60")}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                );

                return (
                  <div
                    key={h.id}
                    onClick={() => onView(h)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === "Enter" ? onView(h) : null)}
                    className="grid grid-cols-12 px-3 py-3 hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    <div className="col-span-1">{userNo}</div>
                    <div className="col-span-5 truncate">{h.title}</div>
                    <div className={cn("col-span-2 text-right", numCls)}>{fmtMoney(h.start_cost)}</div>
                    <div className="col-span-2 text-right">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1",
                          plFmt.positive ? "text-emerald-300 ring-emerald-400/30" : "text-rose-400 ring-rose-400/30"
                        )}
                      >
                        {plFmt.text}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          title="Open"
                          onClick={(e) => {
                            e.stopPropagation();
                            onView(h);
                          }}
                          className="h-8 w-8"
                          aria-label="Open"
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditId(h.id);
                            setEditTitle(h.title || "");
                            setEditStartCost(String(h.start_cost ?? ""));
                            setErrorMsg("");
                            setEditOpen(true);
                          }}
                          className="h-8 w-8"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {deleteDisabled ? (
                          <Tip
                            content={
                              <PrettyTip
                                title="Feature unavailable on Trial."
                                subtitle="Upgrade to be able to delete hunts."
                              />
                            }
                          >
                            <span>{deleteBtn}</span>
                          </Tip>
                        ) : (
                          deleteBtn
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AccentBox>

        {/* Pagination */}
        {!busy && sorted.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-3">
            <div className="text-sm opacity-70">
              Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sorted.length)}</span> of{" "}
              <span className="font-medium">{sorted.length}</span> results{query ? " (filtered)" : ""}.
            </div>
            <div className="flex items-center gap-2">
              <select
                className={cn("h-9 rounded-md border px-2 text-sm", isDark ? "bg-zinc-900 border-white/10" : "bg-white border-zinc-200")}
                value={pageSize}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPageSize(Math.min(5, val));
                  setPage(1);
                }}
              >
                {[5].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-[3.5rem] text-center text-sm">
                  {currentPage}/{totalPages}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete dialog */}
        <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <DialogContent className="bg-zinc-950 border-white/10">
            <DialogHeader>
              <DialogTitle>Delete Bonus Hunt?</DialogTitle>
            </DialogHeader>
            <div className="text-sm opacity-80">
              This action is irreversible and will permanently remove{" "}
              <span className="font-medium">
                {deleteTarget?.title} #{deleteTarget?.number_id}
              </span>
              .
            </div>
            <div className="pt-4 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button className="bg-rose-600 hover:bg-rose-700" onClick={async () => {
                try { await deleteHunt(deleteTarget.id); setDeleteTarget(null); await refresh(); } catch (e) { alert(e.message || "Failed to delete."); }
              }}>Delete</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create / Edit dialogs */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="bg-zinc-950 border-white/10">
            <DialogHeader>
              <DialogTitle>Create Bonus Hunt</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3 mt-2"
              onSubmit={(e) => {
                e.preventDefault();
                (async () => {
                  try {
                    if (!title.trim()) return setErrorMsg("Provide a title.");
                    const sc = Number(startCost);
                    if (Number.isNaN(sc)) return setErrorMsg("Invalid start cost.");
                    await createHunt({ title: title.trim(), start_cost: sc });
                    setCreateOpen(false);
                    setTitle("");
                    setStartCost("");
                    await refresh();
                  } catch (err) {
                    setErrorMsg(err.message || "Failed to create hunt.");
                  }
                })();
              }}
            >
              <div>
                <div className="text-xs mb-1 opacity-70">Title</div>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Hunt 3k" autoFocus />
              </div>
              <div>
                <div className="text-xs mb-1 opacity-70">Start cost</div>
                <Input type="number" step="0.01" inputMode="decimal" value={startCost} onChange={(e) => setStartCost(e.target.value)} placeholder="e.g. 2500" />
              </div>
              {errorMsg && <div className="text-sm text-rose-400">{errorMsg}</div>}
              <div className="pt-2 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="bg-zinc-950 border-white/10">
            <DialogHeader>
              <DialogTitle>Edit Bonus Hunt</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <div className="text-xs mb-1 opacity-70">Title</div>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="e.g. Hunt 3k" />
              </div>
              <div>
                <div className="text-xs mb-1 opacity-70">Start cost</div>
                <Input type="number" step="0.01" inputMode="decimal" value={editStartCost} onChange={(e) => setEditStartCost(e.target.value)} placeholder="e.g. 2500" />
              </div>
              {errorMsg && <div className="text-sm text-rose-400">{errorMsg}</div>}
              <div className="pt-2 flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button onClick={async () => {
                  try {
                    const sc = Number(editStartCost);
                    if (!editTitle.trim()) return setErrorMsg("Provide a title.");
                    if (Number.isNaN(sc)) return setErrorMsg("Invalid start cost.");
                    await updateHunt(editId, { title: editTitle.trim(), start_cost: sc });
                    setEditOpen(false); setEditId(null); setEditTitle(""); setEditStartCost(""); await refresh();
                  } catch (e) {
                    setErrorMsg(e.message || "Failed to update hunt.");
                  }
                }}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {errorMsg && <div className="mt-4 rounded-lg border p-3 text-sm border-rose-500/30 bg-rose-500/10 text-rose-200">{errorMsg}</div>}
      </div>
    </section>
  );
}
