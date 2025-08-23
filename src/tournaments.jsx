// /src/tournaments.jsx
import React from "react";
import { useTheme } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Plus, Search, Calendar as CalendarIcon,
  ChevronDown, ChevronUp, Loader2, Pencil, Trash2, Trophy, Eye, Crown,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

/* ───────────────────────── i18n (default: EN) ───────────────────────── */
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
    loading: "Loading…",
    searchPh: "Search by title…",
    empty: "No tournaments yet.",
    name: "Title",
    status: "Status",
    prizepool: "Prize pool",
    dates: "Dates",
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
    insights: "Insights",
    topSlots: "Top Slots (all-time)",
    topPlayer: "Top Player (wins)",
    noData: "No data yet.",
  },
};
function useLang() {
  // força EN por pedido do utilizador
  const lang = "en";
  const t = React.useCallback((k) => (DICT[lang] && DICT[lang][k]) || k, [lang]);
  return { t, lang };
}

/* ───────────────────────── utils ───────────────────────── */
const LOCALE = "en-GB";
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
const detectKey = (keys, candidates) =>
  candidates.find((k) => keys.includes(k)) || null;

/* ───────────────────────── Insights loader ───────────────────────── */
async function loadInsights() {
  // 1) Top slots (by appearances in tournament_entries)
  const topSlots = [];
  try {
    // traz tudo (se for muito, limita)
    const { data: entries } = await supabase
      .from("tournament_entries")
      .select("*")
      .limit(5000);

    const keys = entries?.[0] ? Object.keys(entries[0]) : [];
    const slotNameKey = detectKey(keys, ["slot_name", "slot", "game_name", "slotName"]);
    const slotIdKey = detectKey(keys, ["slot_id", "slotid", "game_id", "slotId"]);

    // conta
    const nameCounts = new Map();
    const idToCount = new Map();
    const ids = new Set();

    for (const r of entries || []) {
      const nm = slotNameKey ? (r[slotNameKey] || "").toString().trim() : "";
      const sid = slotIdKey ? r[slotIdKey] : null;

      if (nm) nameCounts.set(nm, (nameCounts.get(nm) || 0) + 1);
      else if (sid != null) {
        idToCount.set(sid, (idToCount.get(sid) || 0) + 1);
        ids.add(sid);
      }
    }

    // se só tivermos ids, tenta mapear no catálogo
    let idToName = new Map();
    if (ids.size && nameCounts.size === 0) {
      const { data: cats } = await supabase
        .from("slots_catalog")
        .select('id, "NAME"')
        .in("id", Array.from(ids));
      for (const c of cats || []) idToName.set(c.id, c["NAME"] || `#${c.id}`);
    }

    const arr = [];
    if (nameCounts.size) {
      for (const [name, count] of nameCounts) arr.push({ name, count });
    } else if (idToCount.size) {
      for (const [sid, count] of idToCount) {
        const name = idToName.get(sid) || `Slot ${sid}`;
        arr.push({ name, count });
      }
    }

    arr.sort((a, b) => b.count - a.count);
    topSlots.push(...arr.slice(0, 10));
  } catch (e) {
    // deixa vazio
  }

  // 2) Top player by wins (tries multiple columns on tournaments)
  let topPlayer = { name: "—", wins: 0 };
  try {
    const { data: ts } = await supabase
      .from("tournaments")
      .select("*")
      .eq("status", "finished")
      .limit(2000);

    const keysT = ts?.[0] ? Object.keys(ts[0]) : [];
    const winnerKey = detectKey(keysT, [
      "winner_player",
      "winner_name",
      "winner",
      "champion",
      "champion_player",
      "winner_username",
      "winnerPlayer",
    ]);

    if (winnerKey) {
      const counts = new Map();
      for (const r of ts || []) {
        const who = (r[winnerKey] || "").toString().trim();
        if (!who) continue;
        counts.set(who, (counts.get(who) || 0) + 1);
      }
      let best = null;
      for (const [name, wins] of counts) {
        if (!best || wins > best.wins) best = { name, wins };
      }
      if (best) topPlayer = best;
    }
  } catch (e) {
    // fica "—"
  }

  return { topSlots, topPlayer };
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
                    placeholder="e.g., Summer Cup"
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
                      placeholder="e.g., 500.00"
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

  // insights
  const [insBusy, setInsBusy] = React.useState(true);
  const [topSlots, setTopSlots] = React.useState([]); // [{name,count}]
  const [topPlayer, setTopPlayer] = React.useState({ name: "—", wins: 0 });

  const load = React.useCallback(async () => {
    try {
      setBusy(true);
      setErr("");
      let { data, error } = await supabase.from("tournaments").select("*").limit(500);
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      setRows([]);
      setErr(e.message || "Failed to load tournaments.");
    } finally {
      setBusy(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setInsBusy(true);
        const { topSlots, topPlayer } = await loadInsights();
        if (!cancel) {
          setTopSlots(topSlots);
          setTopPlayer(topPlayer);
        }
      } finally {
        if (!cancel) setInsBusy(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

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
          <Button
            onClick={() => { setEditRow(null); setModalOpen(true); }}
            className="h-10"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("add")}
          </Button>
        </div>
      </div>

      {/* Insights */}
      <Card className={isDark ? "border-white/10 bg-white/5 mb-6" : "mb-6"}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-4 w-4" /> {t("insights")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insBusy ? (
            <div className="text-sm opacity-70 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
            </div>
          ) : (
            <div className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                <div className="text-xs opacity-70 mb-2">{t("topSlots")}</div>
                {topSlots.length === 0 ? (
                  <div className="text-sm opacity-70">{DICT.en.noData}</div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topSlots} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="lg:col-span-4">
                <div className="text-xs opacity-70 mb-2">{t("topPlayer")}</div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-base font-semibold">{topPlayer.name || "—"}</div>
                  <div className="text-sm opacity-70">{topPlayer.wins || 0} wins</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
            <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
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
                  {t(status)}
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
        body={t("areYouSure")}
        confirmText={t("confirm")}
        cancelText={t("cancel")}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
