// /src/tournaments.jsx
import React from "react";
import { useTheme } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Search, ChevronDown, ChevronUp, Loader2, Pencil, Trash2, Trophy, Eye,
} from "lucide-react";

// recharts
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

/* ───────────────────────── i18n (default EN) ───────────────────────── */
const DICT = {
  en: {
    title: "Tournaments",
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    confirm: "Confirm",
    cancel: "Cancel",
    save: "Save",
    creating: "Creating…",
    saving: "Saving…",
    deleting: "Deleting…",
    searchPh: "Search by title…",
    empty: "No tournaments yet.",
    name: "Title",
    status: "Status",
    prizepool: "Prize pool",
    actions: "Actions",
    scheduled: "scheduled",
    running: "running",
    finished: "finished",
    canceled: "canceled",
    editTournament: "Edit tournament",
    newTournament: "New tournament",
    description: "Description",
    areYouSure: "Are you sure you want to delete this tournament? This cannot be undone.",
    open: "Open",
    // Insights
    insights: "Insights",
    topSlotsAll: "Top Slots (all-time)",
    topPlayerWins: "Top Player (wins)",
    lastTournamentWinner: "Last tournament winner",
    player: "Player",
    slot: "Slot",
  },
};
function useLang() {
  const t = React.useCallback((k) => (DICT.en && DICT.en[k]) || k, []);
  return { t, lang: "en" };
}

/* ───────────────────────── utils ───────────────────────── */
const LOCALE = "pt-PT";
const CURRENCY = "EUR";
const numCls = "tabular-nums whitespace-nowrap";
const fmtMoney = (n) =>
  Number.isFinite(Number(n))
    ? new Intl.NumberFormat(LOCALE, {
        style: "currency",
        currency: CURRENCY,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(n))
    : "—";
function useDebounced(v, delay = 300) {
  const [s, setS] = React.useState(v);
  React.useEffect(() => {
    const id = setTimeout(() => setS(v), delay);
    return () => clearTimeout(id);
  }, [v, delay]);
  return s;
}

// A, B, ..., Z, AA, ...
const lettersFromIndex = (idx) => {
  let n = idx + 1;
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
};
const indexFromLetters = (s) => {
  let n = 0;
  for (const ch of String(s || "").toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};
const ceilPow2 = (n) => {
  let p = 1;
  while (p < Math.max(1, n)) p <<= 1;
  return p;
};
const toNum = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/* ───────────────────────── Mini confirm ───────────────────────── */
function Confirm({ open, title, body, confirmText, cancelText, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95]">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-[520px] -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-2xl border border-white/10 bg-zinc-950 text-white shadow-2xl p-5">
          <div className="text-lg font-semibold mb-2">{title}</div>
          <div className="text-sm opacity-80 mb-5">{body}</div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>{cancelText}</Button>
            <Button onClick={onConfirm}>{confirmText}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Create/Edit Modal ───────────────────────── */
function UpsertTournamentModal({ open, initial, onClose, onSaved }) {
  const { t } = useLang();
  const [busy, setBusy] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState("scheduled");
  const [prizePool, setPrizePool] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setStatus(initial?.status ?? "scheduled");
    setPrizePool(initial?.prize_pool ?? initial?.prizepool ?? "");
  }, [open, initial]);

  if (!open) return null;

  async function save() {
    try {
      setBusy(true);
      const payload = {
        title: title || null,
        description: description || null,
        status: status || null,
        prize_pool: prizePool === "" ? null : Number(prizePool),
      };
      if (initial?.id) {
        const { error } = await supabase.from("tournaments").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tournaments").insert([payload]);
        if (error) throw error;
      }
      onSaved && onSaved();
      onClose && onClose();
    } catch (e) {
      alert(e.message || "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  const titleText = initial?.id ? t("editTournament") : t("newTournament");

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-[720px] -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-2xl border border-white/10 bg-zinc-950 text-white shadow-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5" /> {titleText}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <div className="text-[11px] font-semibold tracking-wide opacity-60 mb-2">DETAILS</div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <div className="text-xs opacity-70 mb-1">{t("name")}</div>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Summer Cup"
                    className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white"
                  />
                </div>

                <div>
                  <div className="text-xs opacity-70 mb-1">{t("status")}</div>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="h-11 w-full rounded-xl bg-zinc-900 border border-white/10 px-3 text-sm"
                  >
                    <option value="scheduled">{t("scheduled")}</option>
                    <option value="running">{t("running")}</option>
                    <option value="finished">{t("finished")}</option>
                    <option value="canceled">{t("canceled")}</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs opacity-70 mb-1">{t("prizepool")}</div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">€</span>
                    <Input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={prizePool ?? ""}
                      onChange={(e) => setPrizePool(e.target.value)}
                      placeholder="e.g. 500.00"
                      className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white pl-7"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="text-xs opacity-70 mb-1">{t("description")}</div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl bg-zinc-900 border border-white/10 px-3 py-2 text-sm"
                    placeholder="Notes / rules…"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button onClick={save} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {initial?.id ? t("save") : t("add")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── helpers: winners/insights ───────────────────────── */

function normalizeEntry(row) {
  // columns seen in your DB: seed, player, slot_name, slot_id
  return {
    tournament_id: row.tournament_id,
    seed: row.seed,
    player: row.player ?? row.player_name ?? row.name ?? row.username ?? "—",
    slot_name: row.slot_name ?? row.slot ?? "—",
    slot_id: row.slot_id ?? row.slotid ?? row.game_id ?? null,
  };
}

function computeChampionForTournament(entriesRows, paymentsRows) {
  // entriesRows: array for a single tournament
  // paymentsRows: same tournament (all rounds)
  if (!entriesRows?.length) return null;

  // Map payments -> sums per round/match/side
  const sums = new Map(); // key = `${r}_${m}_${side}` -> number
  for (const r of paymentsRows || []) {
    const key = `${r.round_idx}_${r.match_idx}_${String(r.side || "").toUpperCase()}`;
    const prev = sums.get(key) || 0;
    const add = toNum(r.amount);
    sums.set(key, prev + add);
  }

  // seed order padded to power of two
  const orderedSeeds = [...entriesRows]
    .filter((e) => e.seed)
    .sort((a, b) => indexFromLetters(a.seed) - indexFromLetters(b.seed))
    .map((e) => e.seed);

  const p = Math.max(2, ceilPow2(orderedSeeds.length));
  while (orderedSeeds.length < p) orderedSeeds.push(null);

  // helper to get entry by seed
  const bySeed = {};
  for (const r of entriesRows) bySeed[r.seed] = r;

  const totalRounds = Math.log2(p);
  // round 0: explicit pairs from seeds; next rounds are winners from previous
  let roundPairs = orderedSeeds.map((s, i, arr) => (i % 2 === 0 ? [arr[i], arr[i + 1]] : null)).filter(Boolean);

  for (let r = 0; r < totalRounds; r++) {
    // winner seeds for this round to feed next round
    const nextSeeds = [];
    for (let m = 0; m < roundPairs.length; m++) {
      const [leftSeed, rightSeed] = roundPairs[m];
      // if one side is bye -> other wins
      if (leftSeed && !rightSeed) { nextSeeds.push(leftSeed); continue; }
      if (!leftSeed && rightSeed) { nextSeeds.push(rightSeed); continue; }
      if (!leftSeed && !rightSeed) { nextSeeds.push(null); continue; }

      const sumL = sums.get(`${r}_${m}_L`) || 0;
      const sumR = sums.get(`${r}_${m}_R`) || 0;

      if (sumL > sumR) nextSeeds.push(leftSeed);
      else if (sumR > sumL) nextSeeds.push(rightSeed);
      else nextSeeds.push(null); // tie/undefined
    }

    if (r === totalRounds - 1) {
      const championSeed = nextSeeds[0] || null;
      if (!championSeed) return null;
      const champ = bySeed[championSeed];
      return champ
        ? {
            player: champ.player,
            slot_name: champ.slot_name,
            slot_id: champ.slot_id,
          }
        : null;
    }

    // build next round pairs
    roundPairs = nextSeeds.map((s, i, arr) => (i % 2 === 0 ? [arr[i], arr[i + 1]] : null)).filter(Boolean);
  }

  return null;
}

/* ───────────────────────── Página ───────────────────────── */
export default function TournamentsPage() {
  const { isDark } = useTheme();
  const { t } = useLang();

  const [busy, setBusy] = React.useState(true);
  const [rows, setRows] = React.useState([]);
  const [err, setErr] = React.useState("");

  const [search, setSearch] = React.useState("");
  const dSearch = useDebounced(search, 300);

  const [sort, setSort] = React.useState({ key: "title", dir: 1 }); // 1 asc, -1 desc
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [rowToDelete, setRowToDelete] = React.useState(null);

  // Insights state
  const [chartData, setChartData] = React.useState([]); // {name, wins}
  const [topPlayer, setTopPlayer] = React.useState({ name: "—", wins: 0 });
  const [lastWinner, setLastWinner] = React.useState({ player: "—", slot: "—" });

  const load = React.useCallback(async () => {
    try {
      setBusy(true);
      setErr("");
      let { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: true }) // keep stable ascending for table; we will detect "last" below
        .limit(500);
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      setRows([]);
      setErr(e.message || "Failed to load tournaments.");
    } finally {
      setBusy(false);
    }
  }, []);

  // Load tournaments
  React.useEffect(() => { load(); }, [load]);

  // Load insights whenever tournaments list changes
  React.useEffect(() => {
    const run = async () => {
      try {
        // fetch up to 200 most recent tournaments (id, created_at)
        const ids = (rows || []).map((r) => r.id);
        if (!ids.length) {
          setChartData([]);
          setTopPlayer({ name: "—", wins: 0 });
          setLastWinner({ player: "—", slot: "—" });
          return;
        }

        // entries for all tournaments
        const { data: entriesRaw, error: e1 } = await supabase
          .from("tournament_entries")
          .select("tournament_id, seed, player, slot_name, slot_id")
          .in("tournament_id", ids);
        if (e1) throw e1;

        // payments for all tournaments
        const { data: paysRaw, error: e2 } = await supabase
          .from("tournament_payments")
          .select("tournament_id, round_idx, match_idx, side, amount, updated_at")
          .in("tournament_id", ids);
        if (e2) throw e2;

        // group by tournament_id
        const byTidEntries = new Map();
        for (const r of entriesRaw || []) {
          const e = normalizeEntry(r);
          const arr = byTidEntries.get(e.tournament_id) || [];
          arr.push(e);
          byTidEntries.set(e.tournament_id, arr);
        }
        const byTidPays = new Map();
        for (const p of paysRaw || []) {
          const arr = byTidPays.get(p.tournament_id) || [];
          arr.push(p);
          byTidPays.set(p.tournament_id, arr);
        }

        // champions per tournament
        const champions = [];
        for (const tid of ids) {
          const champ = computeChampionForTournament(byTidEntries.get(tid) || [], byTidPays.get(tid) || []);
          if (champ) champions.push({ ...champ, tournament_id: tid });
        }

        // Aggregate slot wins
        const slotWins = new Map();
        const playerWins = new Map();
        for (const c of champions) {
          const sname = c.slot_name || "—";
          slotWins.set(sname, (slotWins.get(sname) || 0) + 1);
          const pname = c.player || "—";
          playerWins.set(pname, (playerWins.get(pname) || 0) + 1);
        }

        // Build chart data (top 12)
        const chart = [...slotWins.entries()]
          .map(([name, wins]) => ({ name, wins }))
          .sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name))
          .slice(0, 12);
        setChartData(chart);

        // Top player
        if (playerWins.size) {
          const [name, wins] = [...playerWins.entries()].sort((a, b) => b[1] - a[1])[0];
          setTopPlayer({ name, wins });
        } else {
          setTopPlayer({ name: "—", wins: 0 });
        }

        // Last tournament winner (by created_at from rows)
        const last = [...rows]
          .filter(Boolean)
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
        if (last) {
          const found = champions.find((c) => c.tournament_id === last.id);
          setLastWinner({
            player: found?.player || "—",
            slot: found?.slot_name || "—",
          });
        } else {
          setLastWinner({ player: "—", slot: "—" });
        }
      } catch (e) {
        // In case of failure, show empty insights
        setChartData([]);
        setTopPlayer({ name: "—", wins: 0 });
        setLastWinner({ player: "—", slot: "—" });
        // Do not alert here to avoid noise on the listing page
        console.warn("Insights error:", e?.message || e);
      }
    };
    run();
  }, [rows]);

  const filtered = React.useMemo(() => {
    const needle = dSearch.trim().toLowerCase();
    let arr = [...rows];
    if (needle) {
      arr = arr.filter((r) => String(r.title || r.name || "").toLowerCase().includes(needle));
    }
    const get = (r, k) => {
      if (k === "title") return String(r.title || r.name || "");
      if (k === "status") return String(r.status || "");
      if (k === "prize_pool") return Number(r.prize_pool ?? r.prizepool) || 0;
      return 0;
    };
    arr.sort((a, b) => {
      const A = get(a, sort.key);
      const B = get(b, sort.key);
      if (typeof A === "string" || typeof B === "string") return A.localeCompare(B) * sort.dir;
      return (A - B) * sort.dir;
    });
    return arr;
  }, [rows, dSearch, sort]);

  function askDelete(row) { setRowToDelete(row); setConfirmOpen(true); }
  async function confirmDelete() {
    if (!rowToDelete) return;
    try {
      const { error } = await supabase.from("tournaments").delete().eq("id", rowToDelete.id);
      if (error) throw error;
      setConfirmOpen(false);
      setRowToDelete(null);
      await load();
    } catch (e) {
      alert(e.message || "Failed to delete.");
    }
  }

  const HeaderCell = ({ k, children, right }) => {
    const is = sort.key === k;
    return (
      <button
        className={`flex items-center gap-1 ${right ? "justify-end" : ""}`}
        onClick={() => setSort((s) => ({ key: k, dir: is ? -s.dir : 1 }))}
        title="Sort"
      >
        <span>{children}</span>
        <span className="opacity-60">
          {is ? (sort.dir === -1 ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />) : null}
        </span>
      </button>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Topbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          <h1 className="text-xl font-semibold">{t("title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPh")}
              className="pl-8 h-10 rounded-xl bg-zinc-900 border-white/10 text-white placeholder:text-white/40"
            />
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/60" />
          </div>
          <Button onClick={() => { setEditRow(null); setModalOpen(true); }} className="h-10">
            <Plus className="h-4 w-4 mr-2" />
            {t("add")}
          </Button>
        </div>
      </div>

      {/* Insights */}
      <div className={`rounded-2xl border ${isDark ? "border-white/10" : "border-zinc-200"} p-4 mb-6`}>
        <div className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4" /> {t("insights")}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-white/10 p-3">
            <div className="text-sm opacity-70 mb-2">{t("topSlotsAll")}</div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-15}
                    textAnchor="end"
                    interval={0}
                    height={50}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(v) => [`${v} wins`, "Wins"]}
                    cursor={{ fill: "rgba(255,255,255,0.06)" }}
                  />
                  {/* Azul-visível no dark e light */}
                  <Bar dataKey="wins" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 p-3">
              <div className="text-sm opacity-70">{t("topPlayerWins")}</div>
              <div className="mt-3 text-2xl font-semibold">{topPlayer.name}</div>
              <div className="opacity-70">{topPlayer.wins} wins</div>
            </div>

            <div className="rounded-xl border border-white/10 p-3">
              <div className="text-sm opacity-70">{t("lastTournamentWinner")}</div>
              <div className="mt-2 text-sm">
                <div><span className="opacity-70">{t("player")}:</span> <span className="font-semibold">{lastWinner.player}</span></div>
                <div><span className="opacity-70">{t("slot")}:</span> <span className="font-semibold">{lastWinner.slot}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? "border-white/10" : "border-zinc-200"}`}>
        <div className={`${isDark ? "bg-white/[0.04]" : "bg-zinc-50"} grid grid-cols-12 items-center px-4 py-3 text-xs font-semibold`}>
          <div className="col-span-6"><HeaderCell k="title">{t("name")}</HeaderCell></div>
          <div className="col-span-2 text-center"><HeaderCell k="status">{t("status")}</HeaderCell></div>
          <div className="col-span-2 text-right"><HeaderCell k="prize_pool" right>{t("prizepool")}</HeaderCell></div>
          <div className="col-span-2 text-right">{t("actions")}</div>
        </div>

        {busy && (
          <div className="px-4 py-6 text-sm opacity-70 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {err && !busy && <div className="px-4 py-3 text-sm text-red-400">{err}</div>}
        {!busy && filtered.length === 0 && !err && (
          <div className="px-4 py-6 text-sm opacity-70"> {t("empty")} </div>
        )}

        {filtered.map((r) => {
          const title = r.title || r.name || "—";
          const status = r.status || "scheduled";
          const prize = r.prize_pool ?? r.prizepool;

          return (
            <div
              key={r.id}
              className={`grid grid-cols-12 items-center px-4 py-3 border-t ${isDark ? "border-white/10" : "border-zinc-200"}`}
            >
              {/* Title */}
              <div className="col-span-6 min-w-0 pl-2">
                <div className="font-medium truncate">{title}</div>
                <div className="text-xs opacity-70 truncate">{r.description || ""}</div>
              </div>

              {/* Status */}
              <div className="col-span-2 text-center">
                <span
                  className={`text-xs font-semibold rounded-full px-2 py-0.5 border ${
                    status === "running"
                      ? "border-emerald-400/50 text-emerald-300"
                      : status === "finished"
                      ? "border-blue-400/50 text-blue-300"
                      : status === "canceled"
                      ? "border-red-400/50 text-red-300"
                      : "border-white/20 text-white/70"
                  }`}
                >
                  {DICT.en[status] || status}
                </span>
              </div>

              {/* Prize pool */}
              <div className={`col-span-2 text-right ${numCls}`}>{prize != null ? fmtMoney(prize) : "—"}</div>

              {/* Actions */}
              <div className="col-span-2 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  title={DICT.en.open}
                  onClick={() => { window.location.hash = `#/tournaments/${r.id}`; }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  title={t("edit")}
                  onClick={() => { setEditRow(r); setModalOpen(true); }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8 text-white"
                  title={t("delete")}
                  onClick={() => askDelete(r)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <UpsertTournamentModal
        open={modalOpen}
        initial={editRow}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />

      <Confirm
        open={confirmOpen}
        title={t("delete")}
        body={t("areYouSure")}
        confirmText={t("confirm")}
        cancelText={t("cancel")}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
