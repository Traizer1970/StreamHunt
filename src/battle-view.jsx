import React from "react";
import { AuthCtx, useTheme } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Eye,
  Coins,
  Gamepad2,
  TrendingUp,
  Shield,
  Users,
} from "lucide-react";

/* ───────────────────────── utils / style helpers ───────────────────────── */
const cn = (...c) => c.filter(Boolean).join(" ");
const LOCALE = "pt-PT";
const CURRENCY = "EUR";
const fmtMoney = (n) =>
  Number.isFinite(Number(n))
    ? new Intl.NumberFormat(LOCALE, {
        style: "currency",
        currency: CURRENCY,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(n))
    : "—";

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

function Kpi({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
      <div className="rounded-lg bg-black/40 p-2 border border-white/10">{icon}</div>
      <div>
        <div className="text-xs opacity-70">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </div>
  );
}

/* ───────────────────────── small search picker ───────────────────────── */
const DEMO_SLOTS = [
  "Madame Destiny Megaways™",
  "Wanted Dead or a Wild",
  "Gates of Olympus",
  "Sugar Rush",
  "Book of Dead",
  "Le Bandit",
];
function SlotPicker({ placeholder, value, onChange }) {
  const [q, setQ] = React.useState("");
  const opts = React.useMemo(() => {
    const pool = Array.from(new Set([value || "", ...DEMO_SLOTS])).filter(Boolean);
    if (!q) return pool.slice(0, 6);
    const n = q.toLowerCase();
    return pool.filter((s) => s.toLowerCase().includes(n)).slice(0, 6);
  }, [q, value]);
  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <Search className="h-4 w-4 opacity-60" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder || "Add a Slot"}
          className="flex-1 bg-transparent outline-none text-sm"
        />
      </div>
      <div className="p-2 grid gap-1">
        {opts.length === 0 ? (
          <div className="text-xs opacity-60 px-2 py-1">No results…</div>
        ) : (
          opts.map((s) => (
            <button
              key={s}
              onClick={() => onChange && onChange(s)}
              className={cn(
                "text-left px-2 py-2 rounded-lg hover:bg-white/10",
                value === s && "ring-1 ring-sky-400/40"
              )}
            >
              {s}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── main page ───────────────────────── */
export default function BattleView() {
  const { isDark } = useTheme();
  const { profile } = React.useContext(AuthCtx) || {};

  // id a partir do hash: #/battles/123
  const [battleId, setBattleId] = React.useState(null);
  React.useEffect(() => {
    const read = () => {
      const h = String(window.location.hash || "");
      const parts = h.replace(/^#\//, "").split("/");
      const id = Number(parts[1] || parts[0]);
      setBattleId(Number.isFinite(id) ? id : null);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const [busy, setBusy] = React.useState(true);
  const [row, setRow] = React.useState(null); // battles
  const [entries, setEntries] = React.useState([]); // battle_entries
  const [pays, setPays] = React.useState([]); // battle_payments
  const [err, setErr] = React.useState("");

  const [leftSlot, setLeftSlot] = React.useState("");
  const [rightSlot, setRightSlot] = React.useState("");

  const load = React.useCallback(async (id) => {
    if (!id) return;
    try {
      setBusy(true); setErr("");
      const { data: battle, error } = await supabase.from("battles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      setRow(battle);

      const { data: es } = await supabase.from("battle_entries").select("*").eq("battle_id", id).order("id", { ascending: true });
      setEntries(es || []);
      const A = (es || []).find((e) => String(e.seed).toUpperCase() === "A");
      const B = (es || []).find((e) => String(e.seed).toUpperCase() === "B");
      setLeftSlot((A && (A.slot_name || "")) || "");
      setRightSlot((B && (B.slot_name || "")) || "");

      const { data: ps } = await supabase.from("battle_payments").select("*").eq("battle_id", id).limit(1000);
      setPays(ps || []);
    } catch (e) {
      setErr(e.message || "Failed to load battle");
      setRow(null); setEntries([]); setPays([]);
    } finally {
      setBusy(false);
    }
  }, []);

  React.useEffect(() => { if (battleId) load(battleId); }, [battleId, load]);

  async function saveSides() {
    if (!battleId) return;
    try {
      setBusy(true);
      const rows = [];
      if (leftSlot) rows.push({ battle_id: battleId, seed: "A", player_name: profile?.username || profile?.full_name || "", slot_name: leftSlot });
      if (rightSlot) rows.push({ battle_id: battleId, seed: "B", player_name: profile?.username || profile?.full_name || "", slot_name: rightSlot });
      if (rows.length === 0) return;
      await supabase.from("battle_entries").upsert(rows, { onConflict: "battle_id,seed" });
      await load(battleId);
    } catch (e) {
      alert(e.message || "Failed to save entries");
    } finally {
      setBusy(false);
    }
  }

  // KPIs (dummy calc for now)
  const totalPay = (pays || []).reduce((s, r) => s + Number(r.amount || 0), 0);
  const profit = (row && Number(row.prize_pool || 0)) ? totalPay - Number(row.prize_pool || 0) : totalPay;

  return (
    <section className="py-8 md:py-10">
      <div className="max-w-7xl mx-auto px-4">
        {/* header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Battle {row ? `#${row.id}` : ""}</h1>
            {row?.status ? (
              <span className="ml-2 text-xs rounded-lg border border-white/10 bg-white/5 px-2 py-0.5">
                {row.status}
              </span>
            ) : null}
          </div>
          <div className="text-sm opacity-70">{row?.created_at ? new Date(row.created_at).toLocaleDateString() : ""}</div>
        </div>

        {err && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {err}
          </div>
        )}

        {/* grid  */}
        <div className="grid lg:grid-cols-[520px_1fr] gap-6">
          {/* LEFT: overview + stats */}
          <div className="space-y-4">
            <AccentCard>
              {/* profile / date */}
              <div className="flex items-center justify-between rounded-xl bg-black/30 p-3 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-fuchsia-600 text-lg font-bold">{(profile?.username || "?").slice(0,1).toUpperCase()}</div>
                  <div>
                    <div className="text-sm font-medium">{profile?.username || profile?.full_name || "Player"}</div>
                    <div className="text-[10px] opacity-70">{new Date().toLocaleDateString()}</div>
                  </div>
                </div>
                <button className="rounded-xl bg-white/5 px-3 py-1 text-xs ring-1 ring-white/10 hover:bg-white/10">Set as widget</button>
              </div>

              {/* progress bar */}
              <div className="mt-3">
                <div className="rounded-xl bg-black/30 p-2 border border-white/10">
                  <div className="h-2 rounded bg-white/10 overflow-hidden">
                    <div className="h-full bg-sky-500/60" style={{ width: "0%" }} />
                  </div>
                  <div className="mt-1 text-center text-xs opacity-80">0/0</div>
                </div>
              </div>

              {/* settings (read-only for now) */}
              <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-black/30 p-3 border border-white/10 text-sm">
                <div className="opacity-80">Casino: <span className="font-semibold opacity-100">{row?.casino_name || "-"}</span></div>
                <div className="opacity-80">Best Of: <span className="font-semibold opacity-100">{row?.best_of || 1}</span></div>
                <div className="opacity-80 col-span-2">Start Balance: <span className="font-semibold opacity-100">{fmtMoney(row?.start_balance || 0)}</span></div>
              </div>
            </AccentCard>

            <AccentCard>
              <div className="grid grid-cols-3 gap-3">
                <Kpi icon={<Coins className="h-5 w-5" />} label="Total Pay" value={fmtMoney(totalPay)} />
                <Kpi icon={<Gamepad2 className="h-5 w-5" />} label="Score" value={entries.length || 0} />
                <Kpi icon={<TrendingUp className="h-5 w-5" />} label="Profit" value={fmtMoney(profit)} />
              </div>

              <div className="mt-3 rounded-xl border border-white/10 p-3 grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-xs opacity-70">Bonus</div>
                  <div className="font-semibold">-</div>
                </div>
                <div className="text-center">
                  <div className="text-xs opacity-70">Best Win</div>
                  <div className="font-semibold">-</div>
                </div>
                <div className="text-center">
                  <div className="text-xs opacity-70">Best Score</div>
                  <div className="font-semibold">-</div>
                </div>
                <div className="text-center">
                  <div className="text-xs opacity-70">Worst Payment</div>
                  <div className="font-semibold">-</div>
                </div>
              </div>
            </AccentCard>
          </div>

          {/* RIGHT: sides / slots */}
          <div className="space-y-4">
            <AccentCard title="Battle">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs opacity-70 mb-2 flex items-center gap-2"><Shield className="h-4 w-4" /> Side A</div>
                  <SlotPicker value={leftSlot} onChange={setLeftSlot} />
                </div>
                <div>
                  <div className="text-xs opacity-70 mb-2 flex items-center gap-2"><Users className="h-4 w-4" /> Side B</div>
                  <SlotPicker value={rightSlot} onChange={setRightSlot} />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={saveSides} className="h-10">Save</Button>
              </div>
            </AccentCard>
          </div>
        </div>
      </div>
    </section>
  );
}
