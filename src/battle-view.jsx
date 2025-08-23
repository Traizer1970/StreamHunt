import React from "react";
import { useTheme } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Coins, Gamepad2, TrendingUp, Shield, Users } from "lucide-react";

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

/* ───────────────────────── hooks ───────────────────────── */
function useDebounced(v, delay) {
  const [s, setS] = React.useState(v);
  React.useEffect(function () {
    const id = setTimeout(function () { setS(v); }, delay || 300);
    return function () { clearTimeout(id); };
  }, [v, delay]);
  return s;
}

/* ───────────────────────── Remote Slot Picker (Supabase) ───────────────────────── */
// Ajusta aqui os nomes das tabelas/campos do teu catálogo de slots, se necessário.
const SLOT_TABLES = [
  { table: "slots", nameField: "name", providerField: "provider", imageField: "image" },
  { table: "games", nameField: "title", providerField: "provider", imageField: "image" },
  { table: "casino_slots", nameField: "name", providerField: "provider", imageField: "image" },
];

async function fetchSlotsFromAnyTable(q) {
  const query = String(q || "").trim();
  for (let i = 0; i < SLOT_TABLES.length; i++) {
    const cfg = SLOT_TABLES[i];
    try {
      let req = supabase.from(cfg.table).select("*").limit(20);
      if (query) req = req.ilike(cfg.nameField, `%${query}%`);
      const { data, error } = await req;
      if (error) throw error;
      if (Array.isArray(data) && data.length) {
        return data.map(function (r) {
          return {
            id: r.id,
            name: r[cfg.nameField] || "",
            provider: r[cfg.providerField] || "",
            image: r[cfg.imageField] || null,
            _table: cfg.table,
          };
        });
      }
    } catch (e) {
      // tenta próxima tabela
    }
  }
  return [];
}

function RemoteSlotPicker({ placeholder, value, onChange }) {
  const [q, setQ] = React.useState("");
  const dq = useDebounced(q, 250);
  const [opts, setOpts] = React.useState([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(function () {
    let alive = true;
    (async function () {
      setBusy(true);
      const res = await fetchSlotsFromAnyTable(dq);
      if (!alive) return;
      setOpts(res);
      setBusy(false);
    })();
    return function () { alive = false; };
  }, [dq]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <Search className="h-4 w-4 opacity-60" />
        <input value={q} onChange={function(e){ setQ(e.target.value); }} placeholder={placeholder || "Add a Slot"} className="flex-1 bg-transparent outline-none text-sm" />
      </div>
      <div className="p-2 grid gap-1 max-h-[280px] overflow-auto">
        {busy ? (
          <div className="text-xs opacity-60 px-2 py-1">Loading…</div>
        ) : opts.length === 0 ? (
          <div className="text-xs opacity-60 px-2 py-1">No results…</div>
        ) : (
          opts.map(function (s) {
            const isSel = value && value.name === s.name;
            return (
              <button key={(s._table || "t") + ":" + s.id + ":" + s.name}
                onClick={function(){ onChange && onChange(s); }}
                className={cn("text-left px-2 py-2 rounded-lg hover:bg-white/10", isSel && "ring-1 ring-sky-400/40")}
              >
                <div className="font-medium">{s.name}</div>
                <div className="text-xs opacity-60">{s.provider || ""}</div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── main page ───────────────────────── */
export default function BattleView() {
  const { isDark } = useTheme();

  // id a partir do hash: #/battles/123
  const [battleId, setBattleId] = React.useState(null);
  React.useEffect(function () {
    function read() {
      const h = String(window.location.hash || "");
      const parts = h.replace(/^#\//, "").split("/");
      const id = Number(parts[1] || parts[0]);
      setBattleId(Number.isFinite(id) ? id : null);
    }
    read();
    window.addEventListener("hashchange", read);
    return function () { window.removeEventListener("hashchange", read); };
  }, []);

  const [busy, setBusy] = React.useState(true);
  const [row, setRow] = React.useState(null); // battles
  const [err, setErr] = React.useState("");

  // settings
  const [bestOf, setBestOf] = React.useState(1);
  const [buyCost, setBuyCost] = React.useState(0);

  // entries
  const [sideA, setSideA] = React.useState(null); // {name, provider}
  const [sideB, setSideB] = React.useState(null);

  // payments
  const [pays, setPays] = React.useState([]); // battle_payments

  const plannedBuys = Math.max(1, Number(bestOf) || 1) * 2; // por battle 1v1

  const totalPay = (pays || []).reduce(function (s, r) { return s + Number(r.amount || 0); }, 0);
  const totalCost = Number(buyCost || 0) * plannedBuys;
  const profit = totalPay - totalCost;

  const aPays = (pays || []).filter(function (r) { return String(r.side || "").toUpperCase() === "L"; });
  const bPays = (pays || []).filter(function (r) { return String(r.side || "").toUpperCase() === "R"; });

  const aStats = {
    count: aPays.length,
    total: aPays.reduce(function (s, r) { return s + Number(r.amount || 0); }, 0),
    best: aPays.length ? Math.max.apply(null, aPays.map(function(r){return Number(r.amount||0);} )) : 0,
    worst: aPays.length ? Math.min.apply(null, aPays.map(function(r){return Number(r.amount||0);} )) : 0,
  };
  const bStats = {
    count: bPays.length,
    total: bPays.reduce(function (s, r) { return s + Number(r.amount || 0); }, 0),
    best: bPays.length ? Math.max.apply(null, bPays.map(function(r){return Number(r.amount||0);} )) : 0,
    worst: bPays.length ? Math.min.apply(null, bPays.map(function(r){return Number(r.amount||0);} )) : 0,
  };

  const load = React.useCallback(async function (id) {
    if (!id) return;
    try {
      setBusy(true); setErr("");
      // battle row
      const { data: battle, error } = await supabase.from("battles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      setRow(battle);
      setBestOf(Number(battle && battle.best_of) || 1);
      setBuyCost(Number(battle && battle.buy_cost) || 0);

      // entries L/R
      const { data: es } = await supabase.from("battle_entries").select("seed, slot_name, player_name").eq("battle_id", id);
      const A = (es || []).find(function(e){return String(e.seed).toUpperCase()==="A";});
      const B = (es || []).find(function(e){return String(e.seed).toUpperCase()==="B";});
      setSideA(A ? { name: A.slot_name || "", provider: "" } : null);
      setSideB(B ? { name: B.slot_name || "", provider: "" } : null);

      // payments
      const { data: ps } = await supabase.from("battle_payments").select("*").eq("battle_id", id).order("buy_idx", { ascending: true });
      setPays(ps || []);
    } catch (e) {
      setErr(e.message || "Failed to load battle");
      setRow(null); setPays([]);
    } finally {
      setBusy(false);
    }
  }, []);

  React.useEffect(function(){ if (battleId) load(battleId); }, [battleId, load]);

  async function saveSettings() {
    if (!battleId) return;
    try {
      await supabase.from("battles").update({ best_of: Number(bestOf)||1, buy_cost: Number(buyCost)||0 }).eq("id", battleId);
      await load(battleId);
    } catch (e) {
      alert(e.message || "Failed to save settings");
    }
  }

  async function saveSides() {
    if (!battleId) return;
    try {
      const rows = [];
      if (sideA && sideA.name) rows.push({ battle_id: battleId, seed: "A", player_name: null, slot_name: sideA.name });
      if (sideB && sideB.name) rows.push({ battle_id: battleId, seed: "B", player_name: null, slot_name: sideB.name });
      if (rows.length === 0) return;
      await supabase.from("battle_entries").upsert(rows, { onConflict: "battle_id,seed" });
      await load(battleId);
    } catch (e) {
      alert(e.message || "Failed to save entries");
    }
  }

  // quick editor de pagamentos: cria/actualiza buys por lado
  async function setBuy(side, idx, amount) {
    if (!battleId) return;
    const payload = { battle_id: battleId, round_idx: 0, match_idx: 0, side: side, buy_idx: idx, amount: Number(amount)||0 };
    try {
      await supabase.from("battle_payments").upsert([payload], { onConflict: "battle_id,round_idx,match_idx,side,buy_idx" });
      const { data: ps } = await supabase.from("battle_payments").select("*").eq("battle_id", battleId).order("buy_idx", { ascending: true });
      setPays(ps || []);
    } catch (e) {
      alert(e.message || "Failed to save buy");
    }
  }

  function BuysEditor({ side, stats }) {
    const isLeft = side === "L";
    const label = isLeft ? "Side A" : "Side B";
    const buys = (pays || []).filter(function(p){return String(p.side).toUpperCase()===side;});

    const inputs = [];
    const maxN = Math.max(plannedBuys/2, buys.length);
    for (let i=1;i<=maxN;i++) {
      const r = buys.find(function(x){return Number(x.buy_idx)===i;});
      inputs.push(
        <div key={side+"-"+i} className="flex items-center gap-2">
          <div className="w-12 text-xs opacity-70">Buy {i}</div>
          <Input type="number" step="0.01" defaultValue={r ? r.amount : ""} onBlur={function(e){ setBuy(side, i, e.target.value); }} className="h-9 rounded-lg bg-zinc-900 border-white/10 text-white" />
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-white/10 p-3">
        <div className="mb-2 text-xs opacity-70">{label}</div>
        <div className="grid md:grid-cols-2 gap-2">
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Slot</div>
            <div className="font-medium">{isLeft ? (sideA && sideA.name) : (sideB && sideB.name) || "—"}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Buys registados</div>
            <div className="font-semibold">{stats.count}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Total pago</div>
            <div className="font-semibold">{fmtMoney(stats.total)}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Best win</div>
            <div className="font-semibold">{fmtMoney(stats.best)}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Worst payment</div>
            <div className="font-semibold">{fmtMoney(stats.worst)}</div>
          </div>
        </div>
        <div className="mt-3 grid gap-2">{inputs}</div>
      </div>
    );
  }

  return (
    <section className="py-8 md:py-10">
      <div className="max-w-7xl mx-auto px-4">
        {/* header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Battle {row ? `#${row.id}` : ""}</h1>
            {row && row.status ? (
              <span className="ml-2 text-xs rounded-lg border border-white/10 bg-white/5 px-2 py-0.5">{row.status}</span>
            ) : null}
          </div>
          <div className="text-sm opacity-70">{row && row.created_at ? new Date(row.created_at).toLocaleDateString() : ""}</div>
        </div>

        {err ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{err}</div>
        ) : null}

        {/* grid  */}
        <div className="grid lg:grid-cols-[520px_1fr] gap-6">
          {/* LEFT: overview + stats */}
          <div className="space-y-4">
            <AccentCard>
              {/* settings (editáveis) */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs opacity-70 mb-1">Best Of</div>
                  <select value={bestOf} onChange={function(e){ setBestOf(e.target.value); }} className="h-11 w-full rounded-xl bg-zinc-900 border border-white/10 px-3 text-sm">
                    {[1,3,5,7,9].map(function(n){return <option key={n} value={n}>{n}</option>;})}
                  </select>
                </div>
                <div>
                  <div className="text-xs opacity-70 mb-1">Buy cost</div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">€</span>
                    <Input inputMode="decimal" type="number" step="0.01" value={buyCost} onChange={function(e){ setBuyCost(e.target.value); }} className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white pl-7" />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-end"><Button onClick={saveSettings} className="h-10">Save settings</Button></div>
            </AccentCard>

            <AccentCard>
              <div className="grid grid-cols-3 gap-3">
                <Kpi icon={<Coins className="h-5 w-5" />} label="Total Pay" value={fmtMoney(totalPay)} />
                <Kpi icon={<Gamepad2 className="h-5 w-5" />} label="Score" value={(aPays.length + bPays.length)} />
                <Kpi icon={<TrendingUp className="h-5 w-5" />} label="Profit" value={fmtMoney(profit)} />
              </div>
            </AccentCard>
          </div>

          {/* RIGHT: sides / slots + buys editor */}
          <div className="space-y-4">
            <AccentCard title="Battle">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs opacity-70 mb-2 flex items-center gap-2"><Shield className="h-4 w-4" /> Side A</div>
                  <RemoteSlotPicker value={sideA} onChange={setSideA} />
                </div>
                <div>
                  <div className="text-xs opacity-70 mb-2 flex items-center gap-2"><Users className="h-4 w-4" /> Side B</div>
                  <RemoteSlotPicker value={sideB} onChange={setSideB} />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={saveSides} className="h-10">Save sides</Button>
              </div>
            </AccentCard>

            <div className="grid md:grid-cols-2 gap-4">
              <BuysEditor side="L" stats={aStats} />
              <BuysEditor side="R" stats={bStats} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
