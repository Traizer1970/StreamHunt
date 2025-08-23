// /src/tournaments.jsx
import React from "react";
import { useTheme } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* Import icons ONLY from subpaths to avoid Vite scanning the whole package
   (prevents Windows Defender from blocking icons/chrome.js) */
import Plus from "lucide-react/dist/esm/icons/plus.js";
import SearchIcon from "lucide-react/dist/esm/icons/search.js";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-2.js";
import Pencil from "lucide-react/dist/esm/icons/pencil.js";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.js";
import Trophy from "lucide-react/dist/esm/icons/trophy.js";
import Eye from "lucide-react/dist/esm/icons/eye.js";
import Crown from "lucide-react/dist/esm/icons/crown.js";

/* Recharts */
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

/* ───────────────────────── i18n (EN only) ───────────────────────── */
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
    areYouSure:
      "Are you sure you want to delete this tournament? This cannot be undone.",
    open: "Open",
    insights: "Insights",
    topSlots: "Top Slots (all-time)",
    topPlayer: "Top Player (wins)",
    lastWinner: "Last tournament winner",
    wins: "wins",
    none: "—",
  },
};
function useLang() {
  const t = React.useCallback((k) => DICT.en[k] || k, []);
  return { t, lang: "en" };
}

/* ───────────────────────── utils ───────────────────────── */
const LOCALE = "en-US";
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

/* A,B,...Z,AA,AB... */
const lettersFromIndex = (idx) => {
  let n = idx + 1,
    s = "";
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

function useDebounced(v, delay = 300) {
  const [s, setS] = React.useState(v);
  React.useEffect(() => {
    const id = setTimeout(() => setS(v), delay);
    return () => clearTimeout(id);
  }, [v, delay]);
  return s;
}

/* ───────────────────────── Confirm ───────────────────────── */
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

/* ─────────────────────── Upsert Modal ─────────────────────── */
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

/* ─────────────────────── Insights helpers ─────────────────────── */
const PALETTE = (n, isDark) =>
  Array.from({ length: n }, (_, i) => {
    const h = (i * 47) % 360;
    const s = isDark ? 70 : 65;
    const l = isDark ? 58 : 48;
    return `hsl(${h}, ${s}%, ${l}%)`;
  });

function safePlayer(row) {
  return row.player_name ?? row.player ?? row.name ?? row.username ?? null;
}
function safeSlot(row) {
  return row.slot_name ?? row.slot ?? null;
}

/** Build bracket from seeds & payments and return winner seed (or null) */
function computeTournamentWinnerSeed(seedsOrdered, sumsForTournament) {
  const n = seedsOrdered.length;
  const p = Math.max(2, ceilPow2(n));
  const totalRounds = Math.log2(p);

  const filled = [...seedsOrdered];
  while (filled.length < p) filled.push(null);

  let pairs = [];
  for (let i = 0; i < p; i += 2) pairs.push([filled[i], filled[i + 1]]);

  for (let r = 0; r < totalRounds; r++) {
    const next = [];
    for (let m = 0; m < pairs.length; m++) {
      const [sL, sR] = pairs[m];
      const sumL = sumsForTournament?.[r]?.[m]?.L ?? 0;
      const sumR = sumsForTournament?.[r]?.[m]?.R ?? 0;
      let winner = null;
      if (sumL > sumR) winner = sL;
      else if (sumR > sumL) winner = sR;
      else winner = null; // tie or missing data
      next.push(winner);
    }
    if (next.length === 1) return next[0] || null;
    const np = [];
    for (let i = 0; i < next.length; i += 2) np.push([next[i], next[i + 1]]);
    pairs = np;
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

  // Insights
  const [topSlots, setTopSlots] = React.useState([]); // [{name, wins}]
  const [topPlayer, setTopPlayer] = React.useState({ name: null, wins: 0 });
  const [lastWinner, setLastWinner] = React.useState({
    player: null,
    slot: null,
    tournamentId: null,
  });

  const load = React.useCallback(async () => {
    try {
      setBusy(true);
      setErr("");
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: true })
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

  React.useEffect(() => {
    load();
  }, [load]);

  // Load insights when tournaments list changes
  React.useEffect(() => {
    const run = async () => {
      try {
        const ids = rows.map((r) => r.id).filter(Boolean);
        if (!ids.length) {
          setTopSlots([]);
          setTopPlayer({ name: null, wins: 0 });
          setLastWinner({ player: null, slot: null, tournamentId: null });
          return;
        }

        // Entries
        const { data: entries } = await supabase
          .from("tournament_entries")
          .select("tournament_id, seed, player_name, player, name, username, slot_name, slot")
          .in("tournament_id", ids)
          .limit(5000);

        const byTidSeed = new Map();
        for (const e of entries || []) {
          const tid = e.tournament_id;
          if (!byTidSeed.has(tid)) byTidSeed.set(tid, {});
          byTidSeed.get(tid)[e.seed] = {
            seed: e.seed,
            player: safePlayer(e),
            slot: safeSlot(e),
          };
        }

        // Payments -> sums per round/match/side
        const { data: pays } = await supabase
          .from("tournament_payments")
          .select("tournament_id, round_idx, match_idx, side, amount")
          .in("tournament_id", ids)
          .limit(20000);

        const sums = new Map(); // tid -> round -> match -> {L,R}
        for (const p of pays || []) {
          const tid = p.tournament_id;
          if (!sums.has(tid)) sums.set(tid, {});
          const r = p.round_idx ?? 0;
          const m = p.match_idx ?? 0;
          const side = (p.side || "L").toUpperCase();
          const tMap = sums.get(tid);
          if (!tMap[r]) tMap[r] = {};
          if (!tMap[r][m]) tMap[r][m] = { L: 0, R: 0 };
          const val = Number(p.amount ?? 0) || 0;
          tMap[r][m][side] += val;
        }

        // Compute winners
        const slotWins = new Map();
        const playerWins = new Map();
        const lastT = rows[rows.length - 1] || null;
        let lastWinnerInfo = { player: null, slot: null, tournamentId: null };

        for (const tRow of rows) {
          const tid = tRow.id;
          const seedMap = byTidSeed.get(tid) || {};
          const seedsOrdered = Object.keys(seedMap).sort(
            (a, b) => indexFromLetters(a) - indexFromLetters(b)
          );

          const winnerSeed = computeTournamentWinnerSeed(seedsOrdered, sums.get(tid));
          const winnerEntry = winnerSeed ? seedMap[winnerSeed] : null;

          if (winnerEntry) {
            if (winnerEntry.slot) {
              slotWins.set(winnerEntry.slot, (slotWins.get(winnerEntry.slot) || 0) + 1);
            }
            if (winnerEntry.player) {
              playerWins.set(
                winnerEntry.player,
                (playerWins.get(winnerEntry.player) || 0) + 1
              );
            }
            if (lastT && tid === lastT.id) {
              lastWinnerInfo = {
                player: winnerEntry.player || null,
                slot: winnerEntry.slot || null,
                tournamentId: tid,
              };
            }
          }
        }

        const topSlotsArr = [...slotWins.entries()]
          .map(([name, wins]) => ({ name, wins }))
          .sort((a, b) => b.wins - a.wins)
          .slice(0, 12);

        let topP = { name: null, wins: 0 };
        for (const [name, wins] of playerWins.entries()) {
          if (wins > topP.wins) topP = { name, wins };
        }

        setTopSlots(topSlotsArr);
        setTopPlayer(topP);
        setLastWinner(lastWinnerInfo);
      } catch (e) {
        setTopSlots([]);
        setTopPlayer({ name: null, wins: 0 });
        setLastWinner({ player: null, slot: null, tournamentId: null });
        console.warn("Insights error:", e?.message || e);
      }
    };
    run();
  }, [rows]);

  const filtered = React.useMemo(() => {
    const needle = dSearch.trim().toLowerCase();
    let arr = [...rows];
    if (needle) {
      arr = arr.filter((r) =>
        String(r.title || r.name || "").toLowerCase().includes(needle)
      );
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
      if (typeof A === "string" || typeof B === "string")
        return A.localeCompare(B) * sort.dir;
      return (A - B) * sort.dir;
    });
    return arr;
  }, [rows, dSearch, sort]);

  function askDelete(row) {
    setRowToDelete(row);
    setConfirmOpen(true);
  }
  async function confirmDelete() {
    if (!rowToDelete) return;
    try {
      const { error } = await supabase
        .from("tournaments")
        .delete()
        .eq("id", rowToDelete.id);
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
          {is ? (
            sort.dir === -1 ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )
          ) : null}
        </span>
      </button>
    );
  };

  const barColors = PALETTE(Math.max(1, topSlots.length), isDark);

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
            <SearchIcon className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/60" />
          </div>
          <Button
            onClick={() => {
              setEditRow(null);
              setModalOpen(true);
            }}
            className="h-10"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("add")}
          </Button>
        </div>
      </div>

      {/* Insights */}
      <div
        className={`rounded-2xl border p-4 mb-6 ${
          isDark ? "border-white/10 bg-white/[0.04]" : "border-zinc-200 bg-white"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <Crown className="h-5 w-5" />
          <div className="text-lg font-semibold">{t("insights")}</div>
        </div>

        <div className="grid lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 rounded-xl border border-white/10 p-3">
            <div className="text-xs opacity-70 mb-2">{t("topSlots")}</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSlots}>
                  <CartesianGrid strokeDasharray="4 4" strokeOpacity={0.25} />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="wins" radius={[6, 6, 0, 0]}>
                    {topSlots.map((_, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={barColors[i % barColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-4 grid gap-3">
            <div className="rounded-xl border border-white/10 p-4">
              <div className="text-xs opacity-70 mb-1">{t("topPlayer")}</div>
              <div className="text-lg font-semibold">
                {topPlayer.name || t("none")}
              </div>
              <div className="text-sm opacity-70">
                {topPlayer.wins || 0} {t("wins")}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 p-4">
              <div className="text-xs opacity-70 mb-1">{t("lastWinner")}</div>
              <div className="text-sm">
                <div>
                  <span className="opacity-70">Player:</span>{" "}
                  <span className="font-semibold">
                    {lastWinner.player || t("none")}
                  </span>
                </div>
                <div>
                  <span className="opacity-70">Slot:</span>{" "}
                  <span className="font-semibold">
                    {lastWinner.slot || t("none")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        className={`rounded-xl border overflow-hidden ${
          isDark ? "border-white/10" : "border-zinc-200"
        }`}
      >
        <div
          className={`${
            isDark ? "bg-white/[0.04]" : "bg-zinc-50"
          } grid grid-cols-12 items-center px-4 py-3 text-xs font-semibold`}
        >
          <div className="col-span-6">
            <HeaderCell k="title">{t("name")}</HeaderCell>
          </div>
          <div className="col-span-2 text-center">
            <HeaderCell k="status">{t("status")}</HeaderCell>
          </div>
          <div className="col-span-2 text-right">
            <HeaderCell k="prize_pool" right>
              {t("prizepool")}
            </HeaderCell>
          </div>
          <div className="col-span-2 text-right">{t("actions")}</div>
        </div>

        {busy && (
          <div className="px-4 py-6 text-sm opacity-70 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {err && !busy && (
          <div className="px-4 py-3 text-sm text-red-400">{err}</div>
        )}
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
              className={`grid grid-cols-12 items-center px-4 py-3 border-t ${
                isDark ? "border-white/10" : "border-zinc-200"
              }`}
            >
              <div className="col-span-6 min-w-0 pl-2">
                <div className="font-medium truncate">{title}</div>
                <div className="text-xs opacity-70 truncate">
                  {r.description || ""}
                </div>
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
                  {DICT.en[status] || status}
                </span>
              </div>

              <div className={`col-span-2 text-right ${numCls}`}>
                {prize != null ? fmtMoney(prize) : "—"}
              </div>

              <div className="col-span-2 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  title={DICT.en.open}
                  onClick={() => {
                    window.location.hash = `#/tournaments/${r.id}`;
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  title={t("edit")}
                  onClick={() => {
                    setEditRow(r);
                    setModalOpen(true);
                  }}
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
