// /src/widgets/opening-overlay.jsx
import React from "react";
import { listHuntSlots } from "@/lib/slots";
import { getHuntByNumberId } from "@/lib/hunts";
import { cn as _cn } from "@/lib/utils";

const cn = (...c) => (_cn ? _cn(...c) : c.filter(Boolean).join(" "));
const LOCALE = "pt-PT";
const CURRENCY = "EUR";
const toNum = (v) => {
  if (v == null || v === "") return 0;
  if (typeof v === "string") v = v.replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (n) =>
  new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);

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

export default function OpeningOverlay({ numberId }) {
  const [nId, setNId] = React.useState(() => {
    if (numberId) return Number(numberId);
    const m = (location.hash || "").match(/#\/overlay\/opening\/(\d+)/i);
    return Number(m?.[1] || 0);
  });
  React.useEffect(() => {
    const fn = () => {
      const m = (location.hash || "").match(/#\/overlay\/opening\/(\d+)/i);
      setNId(Number(m?.[1] || 0));
    };
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);

  const query = useQuery();
  const LS_KEY = "overlay:opening:defaults";
  const defaults = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
  }, []);

  const pill = (query.get("pill") ?? defaults.pill ?? "1") === "1";
  const thumbs = (query.get("thumbs") ?? defaults.thumbs ?? "1") === "1";
  const title = query.get("title") ?? defaults.title ?? "Opening";
  const pad = Number(query.get("pad") ?? defaults.pad ?? 12);

  const [hunt, setHunt] = React.useState(null);
  const [slots, setSlots] = React.useState([]);
  const [busy, setBusy] = React.useState(true);

  React.useEffect(() => {
    let on = true;
    (async () => {
      try {
        setBusy(true);
        const { hunt } = await getHuntByNumberId(nId);
        const { slots } = await listHuntSlots({ numberId: nId });
        on && setHunt(hunt || null);
        on && setSlots(slots || []);
      } finally { on && setBusy(false); }
    })();
    return () => { on = false; };
  }, [nId]);

  const start = React.useMemo(() => {
    const fromHunt = Number(hunt?.start_cost);
    const fromSlots = slots.reduce((a,s) => a + toNum(s.bet_size), 0);
    return Number.isFinite(fromHunt) ? fromHunt : fromSlots;
  }, [hunt, slots]);
  const won = React.useMemo(() => slots.reduce((a,s) => a + toNum(s.payout), 0), [slots]);
  const pl = won - start;

  return (
    <div className="min-h-screen w-screen bg-transparent text-white">
      <div
        style={{ padding: pad }}
        className="w-full h-full bg-gradient-to-b from-[#0b1324]/90 to-[#0b0a1a]/90"
      >
        <div className="max-w-[720px] mx-auto">
          <div className="text-center mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-sm">
              <span className="opacity-80">{title}</span>
              <span className="opacity-50">•</span>
              <span className="opacity-80">{hunt?.title || (busy ? "…" : "")}</span>
            </div>
          </div>

          {thumbs && (
            <div className="grid grid-cols-6 gap-2 mb-3">
              {slots.slice(0, 12).map((s) => (
                <div key={s.id} className="h-12 rounded-xl overflow-hidden border border-white/10 bg-white/5">
                  {s.thumbnail && (
                    <img src={s.thumbnail} alt="" className="h-full w-full object-cover object-bottom" />
                  )}
                </div>
              ))}
            </div>
          )}

          {pill && (
            <div className="flex justify-center">
              <div className={cn(
                "px-3 py-1.5 rounded-full text-sm border backdrop-blur-sm",
                "bg-white/10 border-white/15",
                pl >= 0 ? "text-emerald-300" : "text-red-300"
              )}>
                P/L: {money(pl)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
