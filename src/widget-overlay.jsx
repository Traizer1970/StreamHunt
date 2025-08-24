// src/widget-overlay.jsx
import React from "react";
import { supabase } from "@/lib/supabase";

function parseHash() {
  const h = (typeof window !== "undefined" ? window.location.hash : "").replace(/^#\/?/, "");
  const [s0, s1, s2] = h.split("?")[0].split("/");
  const qs = new URLSearchParams(h.split("?")[1] || "");
  return {
    token: s0 === "overlay" && s1 === "battle" ? (s2 || "").trim() : "",
    battleId: qs.get("id") ? Number(qs.get("id")) : null,
    fs: Number(qs.get("fs") || 100),
    pad: Number(qs.get("pad") || 24),
    interval: Math.max(800, Number(qs.get("interval") || 2000)),
  };
}

const euro = (n) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number(n || 0));

const eq = (a, b) => {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
};

export default function WidgetOverlay() {
  const [loc, setLoc] = React.useState(parseHash());
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  const [battle, setBattle] = React.useState(null);
  const [left, setLeft] = React.useState(null);
  const [right, setRight] = React.useState(null);
  const [leftBuys, setLeftBuys] = React.useState([]);
  const [rightBuys, setRightBuys] = React.useState([]);
  const [totals, setTotals] = React.useState({ left: 0, right: 0, paid: 0 });

  React.useEffect(() => {
    const onHash = () => setLoc(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function fetchOnce() {
      try {
        setErr("");

        // chama a RPC pública
        const { data, error } = await supabase.rpc("overlay_snapshot", {
          p_token: loc.token,
          p_battle_id: loc.battleId,
        });
        if (error) throw error;
        if (!data?.battle) throw new Error("Nenhuma batalha encontrada para esta conta.");

        const b = data.battle;
        const entries = data.entries || [];
        const pays = data.pays || [];

        // escolhe A e B pelas seeds
        const bySeed = new Map();
        for (const e of entries) if (e.seed) bySeed.set(String(e.seed).toUpperCase(), e);
        const L = bySeed.get("A") || entries[0] || null;
        const R = bySeed.get("B") || entries[1] || null;

        const l = pays.filter((p) => String(p.side || "").toUpperCase() === "L").map((p) => Number(p.amount) || 0);
        const r = pays.filter((p) => String(p.side || "").toUpperCase() === "R").map((p) => Number(p.amount) || 0);
        const sum = (arr) => arr.reduce((a, v) => a + (Number(v) || 0), 0);
        const nextTotals = { left: sum(l), right: sum(r), paid: sum(pays.map((p) => p.amount)) };

        if (!cancelled) {
          if (!eq(battle, b)) setBattle(b);
          if (!eq(left, L)) setLeft(L);
          if (!eq(right, R)) setRight(R);
          if (!eq(leftBuys, l)) setLeftBuys(l);
          if (!eq(rightBuys, r)) setRightBuys(r);
          if (!eq(totals, nextTotals)) setTotals(nextTotals);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || "Falha a carregar overlay.");
          setBattle(null);
          setLeft(null);
          setRight(null);
          setLeftBuys([]);
          setRightBuys([]);
          setTotals({ left: 0, right: 0, paid: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // arranque rápido + polling contínuo
    fetchOnce();
    const id = setInterval(fetchOnce, loc.interval);
    return () => { cancelled = true; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.token, loc.battleId, loc.interval]);

  // -------- UI fullscreen e responsiva --------
  const fs = Number.isFinite(loc.fs) ? loc.fs : 100;
  const pad = Number.isFinite(loc.pad) ? loc.pad : 24;

  const shell = "w-full h-full rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a0b1f]/85 to-[#0e0b1f]/85 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.6)]";
  const chipBase = "px-2 py-1 rounded-full text-[12px] font-semibold border transition-transform duration-150 will-change-transform";
  const chipGreen = "bg-emerald-500/12 border-emerald-400/30 text-emerald-200";
  const chipRed   = "bg-amber-500/12 border-amber-400/30 text-amber-200";

  return (
    <div className="overflow-hidden" style={{ width: "100vw", height: "100vh", background: "transparent" }}>
      <div className="grid place-items-center w-full h-full" style={{ padding: pad, fontSize: `${fs}%` }}>
        <div className={shell} style={{ backdropFilter: "blur(6px)" }}>
          {/* topo */}
          <div className="flex items-center justify-between px-5 py-3">
            <div className="text-sm opacity-80 truncate">{battle?.title || "Battle"}</div>
            <div className="text-[12px] opacity-60">{battle?.status || ""}</div>
          </div>

          {/* conteúdo */}
          {loading ? (
            <div className="h-[70%] grid place-items-center text-sm opacity-80">A carregar…</div>
          ) : err ? (
            <div className="h-[70%] grid place-items-center">
              <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 text-rose-200 px-3 py-2 text-sm">{err}</div>
            </div>
          ) : (
            <div className="px-6 pb-6">
              {/* badges */}
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="inline-flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-white/90 text-sm">
                    <span className="opacity-80">Best of</span>{" "}
                    <span className="font-semibold">{battle?.best_of ?? "—"}</span>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-sky-300 text-sm font-semibold">
                  {euro(battle?.buy_cost || 0)}
                </div>
              </div>

              {/* duas colunas responsivas */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-start">
                {/* LEFT */}
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-xs opacity-70 mb-1">Player</div>
                  <div className="text-lg font-semibold truncate">{left?.player_name || "—"}</div>
                  <div className="text-xs opacity-70 truncate">{left?.slot_name || ""}</div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {leftBuys.length === 0 ? (
                      <span className="text-xs opacity-60">—</span>
                    ) : (
                      leftBuys.map((v, i) => (
                        <span key={i} className={`${chipBase} ${v >= (battle?.buy_cost || 0) ? chipGreen : chipRed}`}>{euro(v)}</span>
                      ))
                    )}
                  </div>

                  <div className="mt-3 text-xs opacity-70">Subtotal</div>
                  <div className="text-sm font-semibold">{euro(totals.left)}</div>
                </div>

                {/* VS */}
                <div className="grid place-items-center">
                  <div className="h-9 w-9 grid place-items-center rounded-full border border-white/15 bg-white/10 font-bold">VS</div>
                </div>

                {/* RIGHT */}
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-xs opacity-70 mb-1">Player</div>
                  <div className="text-lg font-semibold truncate">{right?.player_name || "—"}</div>
                  <div className="text-xs opacity-70 truncate">{right?.slot_name || ""}</div>

                  <div className="mt-2 flex flex-wrap gap-1 justify-end">
                    {rightBuys.length === 0 ? (
                      <span className="text-xs opacity-60">—</span>
                    ) : (
                      rightBuys.map((v, i) => (
                        <span key={i} className={`${chipBase} ${v >= (battle?.buy_cost || 0) ? chipGreen : chipRed}`}>{euro(v)}</span>
                      ))
                    )}
                  </div>

                  <div className="mt-3 text-xs opacity-70 text-right">Subtotal</div>
                  <div className="text-sm font-semibold text-right">{euro(totals.right)}</div>
                </div>
              </div>

              {/* total */}
              <div className="mt-5 grid place-items-end">
                <div className="rounded-full px-3 py-1.5 text-sm font-semibold border border-pink-400/35 bg-pink-500/15 text-pink-200">
                  Total paid: {euro(totals.paid)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
