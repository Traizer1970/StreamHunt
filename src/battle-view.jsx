import React from "react";
import { useTheme } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Coins, Gamepad2, TrendingUp, Shield, Users, Clock3 } from "lucide-react";

/* ───────── utils ───────── */
const cn = (...c) => c.filter(Boolean).join(" ");
const LOCALE = "pt-PT";
const fmtMoney = (n) =>
  Number.isFinite(Number(n))
    ? new Intl.NumberFormat(LOCALE, {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(n))
    : "—";
function useDebounced(v, ms = 300) {
  const [s, setS] = React.useState(v);
  React.useEffect(() => {
    const id = setTimeout(() => setS(v), ms);
    return () => clearTimeout(id);
  }, [v, ms]);
  return s;
}

/* ───────── UI helpers ───────── */
function AccentCard({ title, children, className }) {
  const { isDark } = useTheme();
  return (
    <div className={cn("relative rounded-xl", isDark ? "bg-white/5 border border-white/10" : "bg-white border", className)}>
      <div className="absolute inset-x-0 top-0 h-[2px] bg-sky-500/70 shadow-[0_0_12px_2px_rgba(56,189,248,0.35)]" />
      {title && <div className="px-4 pt-4 pb-1 text-xs opacity-80">{title}</div>}
      <div className="px-4 pt-5 pb-4">{children}</div>
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

/* ───────── SlotsAutocomplete ───────── */
function SlotsAutocomplete({ value, onSelect, placeholder = "Add a Slot" }) {
  const { isDark } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState(
    typeof value === "object" && value ? value.name ?? "" : typeof value === "string" ? value : ""
  );
  const [items, setItems] = React.useState([]);
  const [errorMsg, setErrorMsg] = React.useState("");
  const boxRef = React.useRef(null);
  const dQuery = useDebounced(query, 250);

  const currentValueName = React.useMemo(
    () => (typeof value === "object" && value ? value.name ?? "" : typeof value === "string" ? value : ""),
    [value]
  );
  React.useEffect(() => setQuery(currentValueName), [currentValueName]);

  // fecha dropdown ao clicar fora e confirma texto livre
  const commitFreeText = React.useCallback(() => {
    const q = (query || "").trim();
    const cur = (currentValueName || "").trim();
    if (!q || q === cur) return setOpen(false);
    onSelect?.({ id: null, name: q });
    setOpen(false);
  }, [onSelect, query, currentValueName]);

  React.useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        commitFreeText();
      }
    };
    const onEsc = (e) => e.key === "Escape" && commitFreeText();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [commitFreeText]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const q = (dQuery || "").trim();
      setErrorMsg("");
      if (q.length < 3) return !cancelled && setItems([]);
      try {
        const { data, error } = await supabase
          .from("slots_catalog")
          .select('id, "NAME", "PROVIDER", "THUMBNAIL"')
          .or(`NAME.ilike.%${q}%,PROVIDER.ilike.%${q}%`)
          .order("NAME", { ascending: true })
          .limit(12);
        if (error) throw error;
        if (!cancelled) setItems(data || []);
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(e?.message || "Erro na pesquisa.");
          setItems([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dQuery]);

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="h-11 rounded-xl bg-zinc-900/60 border-white/10 text-white pl-9 focus-visible:ring-1 focus-visible:ring-sky-400 placeholder:text-white/40"
        />
        <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60" />
      </div>
      {open && (
        <div
          className={[
            "absolute z-40 mt-2 w-full rounded-xl overflow-hidden border",
            isDark ? "bg-zinc-950/95 border-white/10 shadow-2xl" : "bg-white border-zinc-200 shadow-xl",
          ].join(" ")}
        >
          {errorMsg && <div className="px-3 py-2 text-sm text-red-400">{errorMsg}</div>}
          {!errorMsg && items.length === 0 ? (
            <div className="px-3 py-2 text-sm opacity-70">Sem resultados. Escreve o nome e clica fora para usar o texto.</div>
          ) : (
            <ul className="max-h-72 overflow-auto divide-y divide-white/5">
              {items.map((it) => (
                <li key={it.id}>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-white/5 transition flex items-center gap-3"
                    onClick={() => {
                      onSelect?.({
                        id: it.id,
                        name: it["NAME"],
                        provider: it["PROVIDER"],
                        thumbnail: it["THUMBNAIL"],
                      });
                      setQuery(it["NAME"]);
                      setOpen(false);
                    }}
                  >
                    {it["THUMBNAIL"] ? (
                      <img src={it["THUMBNAIL"]} alt="" className="h-6 w-6 rounded object-contain" />
                    ) : (
                      <div className="h-6 w-6 rounded bg-white/10" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm">{it["NAME"]}</div>
                      <div className="text-[11px] opacity-60 truncate">{it["PROVIDER"] || "—"}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────── Página ───────── */
export default function BattleView() {
  const { isDark } = useTheme();

  // battle id pelo hash
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
  const [err, setErr] = React.useState("");
  const [row, setRow] = React.useState(null);

  // settings
  const [bestOf, setBestOf] = React.useState(1);
  const [buyCost, setBuyCost] = React.useState(0);

  // sides
  const [sideA, setSideA] = React.useState(null); // {id,name}
  const [sideB, setSideB] = React.useState(null);
  const [playerA, setPlayerA] = React.useState("");
  const [playerB, setPlayerB] = React.useState("");

  // histórico das slots
  const [histA, setHistA] = React.useState(null);
  const [histB, setHistB] = React.useState(null);

  // payments
  const [pays, setPays] = React.useState([]);

  const plannedBuys = Math.max(1, Number(bestOf) || 1) * 2;
  const totalPay = (pays || []).reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalCost = Number(buyCost || 0) * plannedBuys;
  const profit = totalPay - totalCost;

  const aPays = (pays || []).filter((r) => String(r.side || "").toUpperCase() === "L");
  const bPays = (pays || []).filter((r) => String(r.side || "").toUpperCase() === "R");
  const aStats = {
    count: aPays.length,
    total: aPays.reduce((s, r) => s + Number(r.amount || 0), 0),
    best: aPays.length ? Math.max(...aPays.map((r) => Number(r.amount || 0))) : 0,
    worst: aPays.length ? Math.min(...aPays.map((r) => Number(r.amount || 0))) : 0,
  };
  const bStats = {
    count: bPays.length,
    total: bPays.reduce((s, r) => s + Number(r.amount || 0), 0),
    best: bPays.length ? Math.max(...bPays.map((r) => Number(r.amount || 0))) : 0,
    worst: bPays.length ? Math.min(...bPays.map((r) => Number(r.amount || 0))) : 0,
  };

  const load = React.useCallback(async (id) => {
    if (!id) return;
    try {
      setBusy(true);
      setErr("");

      const { data: battle, error } = await supabase.from("battles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      setRow(battle);
      setBestOf(Number(battle?.best_of) || 1);
      setBuyCost(Number(battle?.buy_cost) || 0);

      const { data: es, error: e2 } = await supabase
        .from("battle_entries")
        .select("seed, slot_name, slot_id, player_name")
        .eq("battle_id", id);
      if (e2) throw e2;

      const A = (es || []).find((e) => String(e.seed).toUpperCase() === "A");
      const B = (es || []).find((e) => String(e.seed).toUpperCase() === "B");
      setSideA(A ? { id: A.slot_id ?? null, name: A.slot_name || "" } : null);
      setPlayerA(A?.player_name || "");
      setSideB(B ? { id: B.slot_id ?? null, name: B.slot_name || "" } : null);
      setPlayerB(B?.player_name || "");

      const { data: ps, error: e3 } = await supabase
        .from("battle_payments")
        .select("*")
        .eq("battle_id", id)
        .order("buy_idx", { ascending: true });
      if (e3) throw e3;
      setPays(ps || []);
    } catch (e) {
      setErr(e?.message || "Failed to load battle");
      setRow(null);
      setPays([]);
    } finally {
      setBusy(false);
    }
  }, []);

  React.useEffect(() => {
    if (battleId) load(battleId);
  }, [battleId, load]);

  async function saveSettings() {
    if (!battleId) return;
    const { error } = await supabase
      .from("battles")
      .update({ best_of: Number(bestOf) || 1, buy_cost: Number(buyCost) || 0 })
      .eq("id", battleId);
    if (error) return alert(error.message || "Failed to save settings");
    load(battleId);
  }

  // histórico por slot (mesmo antes de salvar)
  async function fetchSlotHistory(slot, wantedSide /* "L"|"R" */) {
    if (!slot || (!slot.id && !slot.name)) return null;
    try {
      let q = supabase.from("battle_entries").select("battle_id, seed, slot_id, slot_name");
      if (slot.id) q = q.eq("slot_id", slot.id);
      else q = q.ilike("slot_name", `%${slot.name}%`);
      const { data: entries } = await q.limit(500);

      if (!entries?.length) return { times: 0, total: 0, best: 0, worst: 0, last: null };

      const ids = [...new Set(entries.map((e) => e.battle_id))];
      const { data: paysRows } = await supabase
        .from("battle_payments")
        .select("battle_id, side, amount, created_at")
        .in("battle_id", ids)
        .limit(10000);

      const wantedPairs = new Set(
        entries
          .filter((e) =>
            wantedSide === "L" ? String(e.seed).toUpperCase() === "A" : String(e.seed).toUpperCase() === "B"
          )
          .map((e) => `${e.battle_id}:${wantedSide}`)
      );

      const rows = (paysRows || []).filter((p) => wantedPairs.has(`${p.battle_id}:${(p.side || "").toUpperCase()}`));

      const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const best = rows.length ? Math.max(...rows.map((r) => Number(r.amount) || 0)) : 0;
      const worst = rows.length ? Math.min(...rows.map((r) => Number(r.amount) || 0)) : 0;
      const times = entries.filter((e) =>
        wantedSide === "L" ? String(e.seed).toUpperCase() === "A" : String(e.seed).toUpperCase() === "B"
      ).length;

      const lastDate =
        rows.length && rows[0]?.created_at
          ? new Date(Math.max(...rows.map((r) => new Date(r.created_at || 0).getTime())))
          : null;

      return {
        times,
        total,
        best,
        worst,
        last: lastDate ? new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium" }).format(lastDate) : null,
      };
    } catch {
      return null;
    }
  }

  // histórico live (ao escolher slot)
  React.useEffect(() => {
    (async () => setHistA(sideA?.id || sideA?.name ? await fetchSlotHistory(sideA, "L") : null))();
  }, [sideA?.id, sideA?.name]);
  React.useEffect(() => {
    (async () => setHistB(sideB?.id || sideB?.name ? await fetchSlotHistory(sideB, "R") : null))();
  }, [sideB?.id, sideB?.name]);

  // grava lados c/ validação de erro
async function saveSides() {
  if (!battleId) return;
  try {
    const rows = [];
    if (sideA?.name) {
      rows.push({
        battle_id: battleId,
        seed: "A",
        player_name: playerA || null,
        slot_name: sideA.name,
        slot_id: sideA.id ?? null,
      });
    }
    if (sideB?.name) {
      rows.push({
        battle_id: battleId,
        seed: "B",
        player_name: playerB || null,
        slot_name: sideB.name,
        slot_id: sideB.id ?? null,
      });
    }
    if (!rows.length) return;

    const { error } = await supabase
      .from("battle_entries")
      .upsert(rows, { onConflict: "battle_id,seed" }); // sem created_by/owner_id/user_id
    if (error) throw error;

    // recarregar e recalcular histórico
    await load(battleId);
    if (sideA?.name) setHistA(await fetchSlotHistory(sideA, "L"));
    if (sideB?.name) setHistB(await fetchSlotHistory(sideB, "R"));
  } catch (e) {
    alert(e?.message || "Falha a guardar os lados");
  }
}


  // salva um buy
  async function setBuy(side, idx, amount) {
    if (!battleId) return;
    const payload = {
      battle_id: battleId,
      round_idx: 0,
      match_idx: 0,
      side,
      buy_idx: idx,
      amount: Number(amount) || 0,
    };
    const { error } = await supabase
      .from("battle_payments")
      .upsert([payload], { onConflict: "battle_id,round_idx,match_idx,side,buy_idx" });
    if (error) return alert(error.message || "Failed to save buy");
    const { data: ps } = await supabase
      .from("battle_payments")
      .select("*")
      .eq("battle_id", battleId)
      .order("buy_idx", { ascending: true });
    setPays(ps || []);
  }

  function HistoryStrip({ hist }) {
    if (!hist) return null;
    return (
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1">
          <span className="opacity-70">Times:</span> <span className="font-semibold">{hist.times ?? 0}</span>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1">
          <span className="opacity-70">Total:</span> <span className="font-semibold">{fmtMoney(hist.total ?? 0)}</span>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1">
          <span className="opacity-70">Best:</span> <span className="font-semibold">{fmtMoney(hist.best ?? 0)}</span>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1">
          <span className="opacity-70">Worst:</span> <span className="font-semibold">{fmtMoney(hist.worst ?? 0)}</span>
        </div>
        <div className="col-span-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 flex items-center gap-1">
          <Clock3 className="h-3.5 w-3.5 opacity-70" />
          <span className="opacity-70">Last:</span> <span className="font-semibold">{hist.last || "—"}</span>
        </div>
      </div>
    );
  }

  function BuysEditor({ side, stats, player, history }) {
    const isLeft = side === "L";
    const label = isLeft ? "Side A" : "Side B";
    const buys = (pays || []).filter((p) => String(p.side || "").toUpperCase() === side);

    const inputs = [];
    const maxN = Math.max(plannedBuys / 2, buys.length);
    for (let i = 1; i <= maxN; i++) {
      const r = buys.find((x) => Number(x.buy_idx) === i);
      inputs.push(
        <div key={`${side}-${i}`} className="flex items-center gap-2">
          <div className="w-12 text-xs opacity-70">Buy {i}</div>
          <Input
            type="number"
            step="0.01"
            defaultValue={r ? r.amount : ""}
            onBlur={(e) => setBuy(side, i, e.target.value)}
            className="h-9 rounded-lg bg-zinc-900 border-white/10 text-white pl-3"
          />
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-white/10 p-4 pt-6">
        <div className="mb-3 text-xs opacity-70">{label}</div>
        <div className="grid md:grid-cols-2 gap-2">
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Slot</div>
            <div className="font-medium">
              {isLeft ? (sideA && sideA.name) : (sideB && sideB.name) || "\u2014"}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Player</div>
            <div className="font-medium">{player || "\u2014"}</div>
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

        <HistoryStrip hist={history} />

        <div className="mt-4 grid gap-3">{inputs}</div>
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
            {row?.status ? (
              <span className="ml-2 text-xs rounded-lg border border-white/10 bg-white/5 px-2 py-0.5">{row.status}</span>
            ) : null}
          </div>
          <div className="text-sm opacity-70">{row?.created_at ? new Date(row.created_at).toLocaleDateString() : ""}</div>
        </div>

        {err && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {err}
          </div>
        )}

        <div className="grid lg:grid-cols-[520px_1fr] gap-6">
          {/* LEFT */}
          <div className="space-y-4">
            <AccentCard>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs opacity-70 mb-1">Best Of</div>
                  <select
                    value={bestOf}
                    onChange={(e) => setBestOf(e.target.value)}
                    className="h-11 w-full rounded-xl bg-zinc-900 border border-white/10 px-3 text-sm"
                  >
                    {[1, 3, 5, 7, 9].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-xs opacity-70 mb-1">Buy cost</div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">€</span>
                    <Input
                      inputMode="decimal"
                      type="number"
                      step="0.01"
                      value={buyCost}
                      onChange={(e) => setBuyCost(e.target.value)}
                      className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white pl-7"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button onClick={saveSettings} className="h-10">
                  Save settings
                </Button>
              </div>
            </AccentCard>

            <AccentCard>
              <div className="grid grid-cols-3 gap-3">
                <Kpi icon={<Coins className="h-5 w-5" />} label="Total Pay" value={fmtMoney(totalPay)} />
                <Kpi icon={<Gamepad2 className="h-5 w-5" />} label="Score" value={aPays.length + bPays.length} />
                <Kpi icon={<TrendingUp className="h-5 w-5" />} label="Profit" value={fmtMoney(profit)} />
              </div>
            </AccentCard>
          </div>

          {/* RIGHT */}
          <div className="space-y-4">
            <AccentCard title="Battle">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* A */}
                <div>
                  <div className="text-xs opacity-70 mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Side A
                  </div>
                  <div className="space-y-2">
                    <SlotsAutocomplete value={sideA} onSelect={setSideA} placeholder="Add a Slot" />
                    <div>
                      <div className="text-xs opacity-70 mb-1">Player</div>
                      <Input
                        value={playerA}
                        onChange={(e) => setPlayerA(e.target.value)}
                        placeholder="Player name"
                        className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>
                {/* B */}
                <div>
                  <div className="text-xs opacity-70 mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" /> Side B
                  </div>
                  <div className="space-y-2">
                    <SlotsAutocomplete value={sideB} onSelect={setSideB} placeholder="Add a Slot" />
                    <div>
                      <div className="text-xs opacity-70 mb-1">Player</div>
                      <Input
                        value={playerB}
                        onChange={(e) => setPlayerB(e.target.value)}
                        placeholder="Player name"
                        className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={saveSides} className="h-10">
                  Save sides
                </Button>
              </div>
            </AccentCard>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <BuysEditor side="L" stats={aStats} player={playerA} history={histA} />
              <BuysEditor side="R" stats={bStats} player={playerB} history={histB} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
