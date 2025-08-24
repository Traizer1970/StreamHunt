// src/widget-overlay.jsx
import React from "react";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/auth-context";
import { Loader2, Trophy } from "lucide-react";

/** Lê "#/overlay/battle/<token>?id=<battleId>" */
function getParamsFromHash() {
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const clean = hash.replace(/^#\/?/, "");
  const [seg0, seg1, seg2] = clean.split("?")[0].split("/");
  const qs = new URLSearchParams(clean.split("?")[1] || "");
  return {
    token: seg0 === "overlay" && seg1 === "battle" ? (seg2 || "").trim() : "",
    battleId: (qs.get("id") || "").trim(),
  };
}

function euro(n) {
  const v = Number(n || 0);
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

export default function WidgetOverlay() {
  const { isDark } = useTheme();
  const [{ token, battleId }, setLoc] = React.useState(getParamsFromHash());
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [battle, setBattle] = React.useState(null);
  const [left, setLeft] = React.useState(null);
  const [right, setRight] = React.useState(null);
  const [leftBuys, setLeftBuys] = React.useState([]);
  const [rightBuys, setRightBuys] = React.useState([]);
  const [totals, setTotals] = React.useState({ left: 0, right: 0, paid: 0 });

  // reage a alterações do hash no OBS
  React.useEffect(() => {
    const onHash = () => setLoc(getParamsFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");

        // 1) descobre o owner pela token (link fixo por conta)
        let ownerId = null;
        if (token) {
          const { data: prof, error: eP } = await supabase
            .from("profiles")
            .select("id")
            .eq("widget_token", token)
            .maybeSingle();
          if (eP) throw eP;
          if (!prof?.id) throw new Error("Token inválida.");
          ownerId = prof.id;
        }

        // 2) qual a batalha? (id explícito ou a mais recente da conta)
        let bId = battleId || null;
        if (!bId) {
          const { data: b, error: eB } = await supabase
            .from("battles")
            .select("id, title, status, prize_pool, created_at")
            .eq("created_by", ownerId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (eB) throw eB;
          if (!b?.id) throw new Error("Nenhuma batalha encontrada para esta conta.");
          bId = b.id;
          setBattle(b);
        } else {
          const { data: b, error: eB } = await supabase
            .from("battles")
            .select("id, title, status, prize_pool, created_at")
            .eq("id", bId)
            .maybeSingle();
          if (eB) throw eB;
          setBattle(b || { id: bId });
        }

        // 3) entradas (jogadores) + pagamentos
        const { data: entries } = await supabase
          .from("battle_entries")
          .select("player, player_name, slot_name, seed")
          .eq("battle_id", bId);

        const { data: pays } = await supabase
          .from("battle_payments")
          .select("amount, round_idx, match_idx, side, buy_idx")
          .eq("battle_id", bId)
          .order("round_idx", { ascending: true })
          .order("match_idx", { ascending: true })
          .order("buy_idx", { ascending: true });

        // escolher 2 participantes (A e B se houver seeds)
        const bySeed = new Map();
        for (const e of entries || []) {
          if (e?.seed) bySeed.set(String(e.seed).toUpperCase(), e);
        }
        const L = bySeed.get("A") || (entries && entries[0]) || null;
        const R = bySeed.get("B") || (entries && entries[1]) || null;
        setLeft(L);
        setRight(R);

        // separar pagamentos por lado
        const l = (pays || []).filter((p) => String(p.side || "").toUpperCase() === "L");
        const r = (pays || []).filter((p) => String(p.side || "").toUpperCase() === "R");

        setLeftBuys(l.map((p) => Number(p.amount) || 0));
        setRightBuys(r.map((p) => Number(p.amount) || 0));

        const sum = (arr) => arr.reduce((a, b) => a + (Number(b) || 0), 0);
        const tl = sum(l.map((p) => p.amount));
        const tr = sum(r.map((p) => p.amount));
        const paid = sum((pays || []).map((p) => p.amount));
        setTotals({ left: tl, right: tr, paid });
      } catch (e) {
        setErr(e?.message || "Falha a carregar overlay.");
        setLeft(null);
        setRight(null);
        setLeftBuys([]);
        setRightBuys([]);
        setTotals({ left: 0, right: 0, paid: 0 });
      } finally {
        setLoading(false);
      }
    })();
  }, [token, battleId]);

  // ——— UI ———
  const shell =
    "rounded-2xl border backdrop-blur-xl px-4 py-3 w-[820px] max-w-[92vw] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.45)]";
  const shellTone = isDark
    ? "bg-[#0b1220]/88 border-white/10 text-white"
    : "bg-white/90 border-zinc-200 text-zinc-900";

  const chip = "px-2 py-1 rounded-full text-[12px] font-semibold border";
  const chipGreen = isDark
    ? "bg-emerald-500/12 border-emerald-500/25 text-emerald-200"
    : "bg-emerald-100 border-emerald-300 text-emerald-700";
  const chipRed = isDark
    ? "bg-red-500/10 border-red-500/25 text-red-200"
    : "bg-red-100 border-red-300 text-red-700";

  return (
    <div className="grid place-items-center w-screen h-screen bg-transparent">
      <div className={`${shell} ${shellTone}`}>
        {/* header pequenino */}
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex items-center gap-2 text-sm opacity-80">
            <Trophy className="h-4 w-4" />
            <span>{battle?.title || "Battle"}</span>
          </div>
          <div className="text-[12px] opacity-60">
            {battle?.status ? battle.status : ""}
          </div>
        </div>

        {/* conteúdo */}
        {loading ? (
          <div className="py-12 flex items-center justify-center gap-2 opacity-80">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : err ? (
          <div className="py-8 text-center text-red-400">{err}</div>
        ) : (
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
            {/* LEFT */}
            <div className="rounded-xl px-3 py-3 border border-white/10/10 bg-white/5">
              <div className="text-sm opacity-70 mb-1">Player</div>
              <div className="text-lg font-semibold truncate">
                {left?.player_name || left?.player || "—"}
              </div>
              <div className="text-xs opacity-70 truncate">
                {left?.slot_name || ""}
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {leftBuys.length === 0 ? (
                  <span className="text-xs opacity-60">—</span>
                ) : (
                  leftBuys.map((v, i) => (
                    <span key={i} className={`${chip} ${v >= 0 ? chipGreen : chipRed}`}>
                      {euro(v)}
                    </span>
                  ))
                )}
              </div>

              <div className="mt-3 text-xs opacity-70">Subtotal</div>
              <div className="text-sm font-semibold">{euro(totals.left)}</div>
            </div>

            {/* VS */}
            <div className="px-2 py-3">
              <div className="h-8 w-8 grid place-items-center rounded-full border border-white/10 bg-white/10 font-bold">
                VS
              </div>
            </div>

            {/* RIGHT */}
            <div className="rounded-xl px-3 py-3 border border-white/10/10 bg-white/5">
              <div className="text-sm opacity-70 mb-1">Player</div>
              <div className="text-lg font-semibold truncate">
                {right?.player_name || right?.player || "—"}
              </div>
              <div className="text-xs opacity-70 truncate">
                {right?.slot_name || ""}
              </div>

              <div className="mt-2 flex flex-wrap gap-1 justify-end">
                {rightBuys.length === 0 ? (
                  <span className="text-xs opacity-60">—</span>
                ) : (
                  rightBuys.map((v, i) => (
                    <span key={i} className={`${chip} ${v >= 0 ? chipGreen : chipRed}`}>
                      {euro(v)}
                    </span>
                  ))
                )}
              </div>

              <div className="mt-3 text-xs opacity-70 text-right">Subtotal</div>
              <div className="text-sm font-semibold text-right">{euro(totals.right)}</div>
            </div>
          </div>
        )}

        {/* footer total */}
        {!loading && !err && (
          <div className="mt-3 grid place-items-center">
            <div
              className={[
                "rounded-full px-3 py-1 text-sm font-semibold border",
                isDark
                  ? "bg-sky-500/12 border-sky-400/35 text-sky-200"
                  : "bg-sky-100 border-sky-300 text-sky-700",
              ].join(" ")}
            >
              Total paid: {euro(totals.paid)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
