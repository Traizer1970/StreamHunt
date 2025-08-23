// /src/tournaments.jsx
import React from "react";
import { useTheme } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Search, ChevronDown, ChevronUp, Loader2, Pencil, Trash2, Trophy, Eye, Crown
} from "lucide-react";

/* ───────────────────────── i18n ───────────────────────── */
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
    searchPh: "Search by title...",
    empty: "No tournaments yet.",
    name: "Title",
    status: "Status",
    prizepool: "Prize pool",
    actions: "Actions",
    scheduled: "scheduled",
    running: "running",
    finished: "finished",
    canceled: "canceled",
    open: "Open",
    insights: "Insights",
    topSlots: "Top Slots (all-time)",
    topPlayer: "Top Player (wins)",
    lastWinner: "Last tournament winner",
    player: "Player",
    slot: "Slot",
    wins: "wins",
    totalPrize: "Total prize won",
    lastPrize: "Last prize won",
  },
  pt: {} // mantido vazio para forçar inglês nesta página
};
const t = (k) => DICT.en[k] || k;

/* ───────────────────────── utils ───────────────────────── */
const TOP3_COLORS = ["#6366F1", "#22C55E", "#F59E0B"]; // indigo, green, amber
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

const toNum = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const ceilPow2 = (n) => { let p = 1; while (p < Math.max(1, n)) p <<= 1; return p; };
const lettersFromIndex = (idx) => { let n = idx + 1, s = ""; while (n > 0){ n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n/26);} return s; };
const indexFromLetters = (s) => { let n = 0; for (const ch of String(s).toUpperCase()) n = n*26 + (ch.charCodeAt(0) - 64); return n-1; };
function useDebounced(v, delay = 300) {
  const [s, setS] = React.useState(v);
  React.useEffect(() => { const id = setTimeout(() => setS(v), delay); return () => clearTimeout(id); }, [v, delay]);
  return s;
}

// tiny avatar placeholder (with initials)
function Avatar({ name }) {
  const initials = String(name || "?")
    .split(/\s+/).map(p => p[0]).join("").slice(0,2).toUpperCase();
  return (
    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 text-white grid place-items-center text-[11px] font-extrabold shadow ring-2 ring-black/20">
      {initials || "?"}
    </div>
  );
}

/* ───────────────────────── Custom Chart (Recharts) ───────────────────────── */
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from "recharts";

const BAR_COLORS = ["#6366F1", "#22C55E", "#F59E0B"]; // indigo, green, amber

function NiceTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/95 text-white px-3 py-2 shadow-2xl">
      <div className="text-xs opacity-70">{t("slot")}</div>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-1 text-xs"><span className="opacity-70">{t("wins")}:</span> <span className="font-semibold">{p.value}</span></div>
    </div>
  );
}

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

  const titleText = initial?.id ? "Edit tournament" : "New tournament";

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
                  <div className="text-xs opacity-70 mb-1">Title</div>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Summer Cup"
                    className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white"
                  />
                </div>

                <div>
                  <div className="text-xs opacity-70 mb-1">Status</div>
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
                      placeholder="e.g., 500.00"
                      className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white pl-7"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="text-xs opacity-70 mb-1">Description</div>
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

/* ───────────────────────── Bracket winner helpers ───────────────────────── */
// Build bracket from ordered seed list and decide winners using payments map
function computeTournamentWinner(entries, paymentsRows) {
  if (!Array.isArray(entries) || entries.length < 2) return null;

  const bySeed = {};
  entries.forEach((e) => { if (e?.seed) bySeed[e.seed] = e; });

  const seedList = [...Object.keys(bySeed)]
    .sort((a,b) => indexFromLetters(a) - indexFromLetters(b));

  const p = Math.max(2, ceilPow2(seedList.length));
  const filled = [...seedList];
  while (filled.length < p) filled.push(null);

  // index payments -> map["R{r}M{m}-{L|R}-B{b}"] = amount
  const payMap = {};
  for (const r of paymentsRows || []) {
    const k = `R${r.round_idx}M${r.match_idx}-${(r.side || "").toUpperCase()}-B${r.buy_idx}`;
    payMap[k] = Number(r.amount) || 0;
  }
  const sumSide = (r, m, side, buys = 3) => {
    let s = 0;
    for (let i = 1; i <= Math.max(1, buys); i++) {
      const k = `R${r}M${m}-${side}-B${i}`;
      s += Number(payMap[k] || 0);
    }
    return s;
  };

  const rounds = [];
  // round 0
  const r0 = [];
  for (let i=0; i<p; i+=2) {
    const Ls = filled[i];
    const Rs = filled[i+1];
    r0.push({
      leftSeed: Ls, rightSeed: Rs,
      left: Ls ? bySeed[Ls] : null,
      right: Rs ? bySeed[Rs] : null
    });
  }
  rounds.push(r0);

  // propagate
  const totalRounds = Math.log2(p);
  for (let r=0; r<totalRounds-1; r++) {
    const cur = rounds[r];
    const next = Array.from({length: Math.ceil(cur.length/2)}, () => ({
      left: null, right: null, leftSeed: null, rightSeed: null
    }));
    for (let m=0; m<cur.length; m++) {
      const match = cur[m];
      const sumL = sumSide(r, m, "L");
      const sumR = sumSide(r, m, "R");
      const winnerSide = sumL > sumR ? "L" : sumR > sumL ? "R" : null;
      const target = next[Math.floor(m/2)];
      if (winnerSide === "L" && match.left) {
        if (m % 2 === 0) { target.left = match.left; target.leftSeed = match.leftSeed; }
        else { target.right = match.left; target.rightSeed = match.leftSeed; }
      } else if (winnerSide === "R" && match.right) {
        if (m % 2 === 0) { target.left = match.right; target.leftSeed = match.rightSeed; }
        else { target.right = match.right; target.rightSeed = match.rightSeed; }
      }
    }
    rounds.push(next);
  }

  const finalRound = rounds[rounds.length - 1];
  const finalMatch = finalRound?.[0];
  if (!finalMatch) return null;

  // winner of final by payments at last round index
  const lastR = rounds.length - 1;
  const finalSumL = sumSide(lastR, 0, "L");
  const finalSumR = sumSide(lastR, 0, "R");
  const winner = finalSumL > finalSumR ? finalMatch.left : finalMatch.right;
  return winner || null;
}

/* ───────────────────────── Página ───────────────────────── */
export default function TournamentsPage() {
  const { isDark } = useTheme();

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

  // insights
  const [chartData, setChartData] = React.useState([]); // [{name, wins}]
  const [topPlayer, setTopPlayer] = React.useState({ name: "", wins: 0, totalPrize: 0, lastPrize: 0 });
  const [lastWinner, setLastWinner] = React.useState({ player: "", slot: "" });

  const load = React.useCallback(async () => {
    try {
      setBusy(true);
      setErr("");
      let { data, error } = await supabase.from("tournaments").select("*").limit(500);
      if (error) throw error;
      // order by created_at/starts_at desc for “last winner”
      const ordered = [...(data || [])].sort((a,b) => {
        const da = new Date(a?.created_at || a?.starts_at || 0).getTime();
        const db = new Date(b?.created_at || b?.starts_at || 0).getTime();
        return db - da;
      });
      setRows(ordered);
      // compute insights
      await computeInsights(ordered);
    } catch (e) {
      setRows([]);
      setErr(e.message || "Failed to load tournaments.");
    } finally {
      setBusy(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // compute chart + top player + last winner
async function computeInsights(tournaments) {
  try {
    if (!tournaments?.length) {
      setChartData([]);
      setTopPlayer({ name: "", wins: 0, totalPrize: 0, lastPrize: 0 });
      setLastWinner({ player: "", slot: "" });
      return;
    }

    const ids = tournaments.map((t) => t.id);
    if (!ids.length) {
      setChartData([]);
      setTopPlayer({ name: "", wins: 0, totalPrize: 0, lastPrize: 0 });
      setLastWinner({ player: "", slot: "" });
      return;
    }

    // Lê entradas, pagamentos e prémios (1º lugar) para estes torneios
    const { data: entries, error: e1 } = await supabase
      .from("tournament_entries")
      .select("*")
      .in("tournament_id", ids)
      .limit(5000);
    if (e1) throw e1;

    const { data: pays, error: e2 } = await supabase
      .from("tournament_payments")
      .select("*")
      .in("tournament_id", ids)
      .limit(10000);
    if (e2) throw e2;

    const { data: prizeRows, error: e3 } = await supabase
      .from("tournament_prizes")
      .select("tournament_id, position, amount")
      .in("tournament_id", ids)
      .limit(5000);
    if (e3) throw e3;

    // Índices auxiliares
    const byTournamentEntries = new Map();
    for (const r of entries || []) {
      const arr = byTournamentEntries.get(r.tournament_id) || [];
      arr.push({
        seed: r.seed,
        player_name: r.player ?? r.player_name ?? "",
        slot_name: r.slot_name ?? "",
        slot_id: r.slot_id ?? null,
      });
      byTournamentEntries.set(r.tournament_id, arr);
    }

    const byTournamentPays = new Map();
    for (const p of pays || []) {
      const arr = byTournamentPays.get(p.tournament_id) || [];
      arr.push(p);
      byTournamentPays.set(p.tournament_id, arr);
    }

    // Descobrir vencedor de cada torneio
    const winners = [];
    for (const t of tournaments) {
      const w = computeTournamentWinner(
        byTournamentEntries.get(t.id) || [],
        byTournamentPays.get(t.id) || []
      );
      if (w) winners.push({ tournament_id: t.id, player: w.player_name || "", slot: w.slot_name || "" });
    }

    // Map vitórias por slot
    const slotWins = new Map();
    for (const w of winners) {
      const name = w.slot || "—";
      slotWins.set(name, (slotWins.get(name) || 0) + 1);
    }

    // Candidatos ordenados por vitórias
    const orderedWins = [...slotWins.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, wins]) => ({ name, wins }));

    // Se faltar para 3, preencher com slots mais frequentes em entradas (0 wins)
    if (orderedWins.length < 3) {
      const entryFreq = new Map();
      for (const e of entries || []) {
        const nm = (e.slot_name || "").trim();
        if (!nm) continue;
        entryFreq.set(nm, (entryFreq.get(nm) || 0) + 1);
      }
      const candidatesByAppear = [...entryFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([nm]) => nm);

      for (const nm of candidatesByAppear) {
        if (orderedWins.length >= 3) break;
        if (!orderedWins.some((x) => x.name === nm)) {
          orderedWins.push({ name: nm, wins: 0 });
        }
      }
      // Se mesmo assim não chegar, coloca placeholders
      while (orderedWins.length < 3) orderedWins.push({ name: "—", wins: 0 });
    }

    // Top 3 final
    const topSlots = orderedWins.slice(0, 3);
    setChartData(topSlots);

    // Top player (wins)
    const playerWins = new Map();
    for (const w of winners) {
      playerWins.set(w.player, (playerWins.get(w.player) || 0) + 1);
    }
    const topP = [...playerWins.entries()].sort((a, b) => b[1] - a[1])[0];
    const topPlayerName = topP?.[0] || "";
    const topPlayerWins = topP?.[1] || 0;

    // Prémios (1º lugar em tournament_prizes; fallback prize_pool)
    const prizeByTournament = new Map();
    for (const r of prizeRows || []) {
      if (Number(r.position) === 1) prizeByTournament.set(r.tournament_id, Number(r.amount) || 0);
    }
    for (const t of tournaments) {
      if (!prizeByTournament.has(t.id)) {
        const v = Number(t.prize_pool);
        if (Number.isFinite(v)) prizeByTournament.set(t.id, v);
      }
    }

    let totalPrize = 0;
    for (const w of winners) {
      if (w.player === topPlayerName) totalPrize += prizeByTournament.get(w.tournament_id) || 0;
    }

    // Último vencedor (primeiro na lista ordenada por created_at desc)
    let last = null;
    for (const t of tournaments) {
      const w = winners.find((x) => x.tournament_id === t.id);
      if (w) {
        last = { ...w, prize: prizeByTournament.get(t.id) || 0 };
        break;
      }
    }

    setTopPlayer({
      name: topPlayerName,
      wins: topPlayerWins,
      totalPrize,
      lastPrize: last?.player === topPlayerName ? (last?.prize || 0) : 0,
    });

    setLastWinner({
      player: last?.player || "",
      slot: last?.slot || "",
    });
  } catch (err) {
    console.error("computeInsights:", err);
    setChartData([]);
    setTopPlayer({ name: "", wins: 0, totalPrize: 0, lastPrize: 0 });
    setLastWinner({ player: "", slot: "" });
  }
}

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
      <div className="flex items-center justify-between mb-5">
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
        <div className="flex items-center gap-2 mb-3">
          <Crown className="h-4 w-4" />
          <div className="text-lg font-semibold">{t("insights")}</div>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-4">
          {/* left: chart */}
          <div className="rounded-xl border border-white/10 p-3">
            <div className="text-sm opacity-70 mb-2">{t("topSlots")}</div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <Bar dataKey="wins" radius={[8, 8, 0, 0]}>
  {chartData.map((_, idx) => (
    <Cell key={`cell-${idx}`} fill={TOP3_COLORS[idx % TOP3_COLORS.length]} />
  ))}
</Bar>

              </ResponsiveContainer>
            </div>
          </div>

          {/* right: cards */}
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 p-4">
              <div className="text-sm opacity-70 mb-2">{t("topPlayer")}</div>
              {topPlayer.name ? (
                <div className="flex items-center gap-3">
                  <Avatar name={topPlayer.name} />
                  <div className="min-w-0">
                    <div className="text-xl font-semibold truncate">{topPlayer.name}</div>
                    <div className="text-sm opacity-80">{topPlayer.wins} {t("wins")}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                        <div className="opacity-70">{t("totalPrize")}</div>
                        <div className="font-semibold">{fmtMoney(topPlayer.totalPrize)}</div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                        <div className="opacity-70">{t("lastPrize")}</div>
                        <div className="font-semibold">{fmtMoney(topPlayer.lastPrize)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm opacity-60">—</div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 p-4">
              <div className="text-sm opacity-70 mb-2">{t("lastWinner")}</div>
              <div className="text-sm"><span className="opacity-70">{t("player")}: </span><span className="font-medium">{lastWinner.player || "—"}</span></div>
              <div className="text-sm"><span className="opacity-70">{t("slot")}: </span><span className="font-medium">{lastWinner.slot || "—"}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
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
          <div className="px-4 py-6 text-sm opacity-70">{t("empty")}</div>
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
              <div className="col-span-6 min-w-0 pl-2">
                <div className="font-medium truncate">{title}</div>
                <div className="text-xs opacity-70 truncate">{r.description || ""}</div>
              </div>

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
                  {t(status)}
                </span>
              </div>

              <div className={`col-span-2 text-right ${numCls}`}>{prize != null ? fmtMoney(prize) : "—"}</div>

              <div className="col-span-2 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  title={t("open")}
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
        body="Are you sure you want to delete this tournament? This cannot be undone."
        confirmText={t("confirm")}
        cancelText={t("cancel")}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
