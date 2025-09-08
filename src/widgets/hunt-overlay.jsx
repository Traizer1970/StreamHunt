// /src/widgets/hunt-overlay.jsx
import React from "react";
import { getHuntByNumberId } from "@/lib/hunts";
import { listHuntSlots } from "@/lib/slots";
import { cn as _cn } from "@/lib/utils";

const cn = (...c) => (_cn ? _cn(...c) : c.filter(Boolean).join(" "));
const LOCALE = "pt-PT";
const CURRENCY = "EUR";

function money(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "€0,00";
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
const toNum = (v) => {
  if (v == null || v === "") return 0;
  if (typeof v === "string") v = v.replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function useQuery() {
  const [q, setQ] = React.useState(() => new URLSearchParams(location.search));
  React.useEffect(() => {
    const fn = () => setQ(new URLSearchParams(location.search));
    window.addEventListener("popstate", fn);
    window.addEventListener("hashchange", fn);
    return () => {
      window.removeEventListener("popstate", fn);
      window.removeEventListener("hashchange", fn);
    };
  }, []);
  return q;
}

export default function HuntOverlay({ numberId }) {
  // numberId via hash: #/overlay/hunt/:id
  const [nId, setNId] = React.useState(() => {
    if (numberId) return Number(numberId);
    const m = (location.hash || "").match(/#\/overlay\/hunt\/(\d+)/i);
    return Number(m?.[1] || 0);
  });

  React.useEffect(() => {
    const onHash = () => {
      const m = (location.hash || "").match(/#\/overlay\/hunt\/(\d+)/i);
      setNId(Number(m?.[1] || 0));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const query = useQuery();

  // settings (cada overlay é independente → chave distinta)
  const LS_KEY = "overlay:hunt:defaults";
  const defaults = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    } catch {
      return {};
    }
  }, []);

  // novo: design = "cards" | "classic"
  const design = query.get("design") || defaults.design || "cards";

  // comuns
  const align = query.get("align") ?? defaults.align ?? "center";
  const pad = Number(query.get("pad") ?? defaults.pad ?? 16);

  // clássico (retrocompatível)
  const showStart = (query.get("kpi") || defaults.kpi || "start,won,pl")
    .split(",")
    .includes("start");
  const showWon = (query.get("kpi") || defaults.kpi || "start,won,pl")
    .split(",")
    .includes("won");
  const showPL = (query.get("kpi") || defaults.kpi || "start,won,pl")
    .split(",")
    .includes("pl");
  const grid = (query.get("grid") ?? defaults.grid ?? "1") === "1";
  const thumbs = (query.get("thumbs") ?? defaults.thumbs ?? "1") === "1";
  const pulse = (query.get("pulse") ?? defaults.pulse ?? "1") === "1";
  const shine = (query.get("shine") ?? defaults.shine ?? "1") === "1";
  const chip = (query.get("style") ?? defaults.style ?? "chip") === "chip";

  const [busy, setBusy] = React.useState(true);
  const [hunt, setHunt] = React.useState(null);
  const [slots, setSlots] = React.useState([]);

  React.useEffect(() => {
    let on = true;
    (async () => {
      try {
        setBusy(true);
        const { hunt } = await getHuntByNumberId(nId);
        const { slots } = await listHuntSlots({ numberId: nId });
        if (!on) return;
        setHunt(hunt || null);
        setSlots(slots || []);
      } finally {
        on && setBusy(false);
      }
    })();
    return () => {
      on = false;
    };
  }, [nId]);

  // KPIs
  const start = React.useMemo(() => {
    const fromHunt = Number(hunt?.start_cost);
    const fromSlots = slots.reduce((a, s) => a + toNum(s.bet_size), 0);
    return Number.isFinite(fromHunt) ? fromHunt : fromSlots;
  }, [hunt, slots]);

  const won = React.useMemo(
    () => slots.reduce((a, s) => a + toNum(s.payout), 0),
    [slots]
  );
  const be = Math.max(0, start - won); // Break-Even restante
  const pl = won - start;

  if (design === "cards") {
    return (
      <div
        style={{ padding: pad }}
        className={cn(
          "min-h-screen w-screen",
          "bg-gradient-to-b from-[#1b0f2e] to-[#0f0a1b] text-white",
          align === "center" ? "flex items-start justify-center" : "block"
        )}
      >
        <div className="w-full max-w-[860px]">
          {/* Header minimal + badges Start • BE • #Bonus */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-sm">
              {hunt?.title || (busy ? "…" : "Hunt")}
            </div>
            <div className="flex items-center gap-2 text-[12px]">
              <div className="px-2 py-1 rounded-full border border-white/15 bg-white/10">
                Start: <span className="tabular-nums font-semibold">{money(start)}</span>
              </div>
              <div className="px-2 py-1 rounded-full border border-white/15 bg-white/10">
                B/E: <span className="tabular-nums font-semibold">{money(be)}</span>
              </div>
              <div className="px-2 py-1 rounded-full border border-white/15 bg-white/10">
                Bonus: <span className="tabular-nums font-semibold">{slots.length}</span>
              </div>
            </div>
          </div>

          {/* Cards apenas */}
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
            {slots.map((s) => (
              <div
                key={s.id}
                className="h-[60px] rounded-xl overflow-hidden border border-white/10 bg-black/20"
                title={s.name}
              >
                {s.thumbnail ? (
                  <img
                    src={s.thumbnail}
                    alt=""
                    className="h-full w-full object-cover object-bottom"
                  />
                ) : null}
              </div>
            ))}
            {slots.length === 0 && (
              <div className="col-span-full text-sm opacity-70">
                (Sem slots neste hunt)
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Clássico (mantido para compatibilidade)
  return (
    <div
      style={{ padding: pad }}
      className={cn(
        "min-h-screen w-screen",
        "bg-gradient-to-b from-[#2a1140] to-[#190a2b] text-white",
        align === "center" ? "flex items-start justify-center" : "block"
      )}
    >
      <div className="w-full max-w-[720px]">
        <div className="mx-auto mb-3 w-fit px-3 py-1 rounded-full bg-white/10 border border-white/10 text-sm">
          {hunt?.title || (busy ? "…" : "Hunt")}
        </div>

        <div className={cn(grid ? "grid grid-cols-1 gap-2" : "space-y-2", "mb-2")}>
          {showStart && (
            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <div className="text-[11px] opacity-70">Start</div>
              <div className="font-semibold tabular-nums">{money(start)}</div>
            </div>
          )}
          {showWon && (
            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <div className="text-[11px] opacity-70">Won</div>
              <div className="font-semibold tabular-nums">{money(won)}</div>
            </div>
          )}
          {showPL && (
            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <div className="text-[11px] opacity-70">P/L</div>
              <div
                className={cn(
                  "font-semibold tabular-nums",
                  pl >= 0 ? "text-emerald-400" : "text-red-400"
                )}
              >
                {money(pl)}
              </div>
            </div>
          )}
        </div>

        {thumbs && (
          <div className="flex flex-wrap gap-2">
            {slots.slice(0, 12).map((s) => (
              <div
                key={s.id}
                className={cn(
                  "h-12 w-[88px] rounded-xl overflow-hidden border border-white/10 bg-black/20",
                  shine && "shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]"
                )}
              >
                {s.thumbnail ? (
                  <img
                    src={s.thumbnail}
                    alt=""
                    className="h-full w-full object-cover object-bottom"
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}

        {chip && (
          <div className="mt-4 flex justify-center">
            <div
              className={cn(
                "px-3 py-1.5 rounded-full text-sm border",
                "backdrop-blur-sm bg-white/10 border-white/15",
                pulse && "animate-pulse"
              )}
            >
              P/L: {money(pl)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
