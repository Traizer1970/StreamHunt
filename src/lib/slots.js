// /src/lib/slots.js
import { supabase } from "@/lib/supabase";

/* -----------------------------------------------------------
   Helpers
----------------------------------------------------------- */

function firstDefined(...vals) {
  for (const v of vals) if (v !== undefined && v !== null) return v;
  return undefined;
}

const ORDER_COLS = ["order_index", "order", "position", "sort", "order_idx"];
const HUNT_COLS  = ["hunt_number_id", "hunt_id", "hunt_number", "huntid"];
const SUPER_COLS = ["is_super", "super", "super_bonus"];

function normCatalogRow(r) {
  if (!r) return null;
  const id =
    firstDefined(r.id, r.ID, r.slot_id, r.SLOT_ID, r.slotId, r.SLOTID) ?? null;
  const name = firstDefined(r.name, r.NAME, r.title, r.TITLE) ?? "";
  const provider = firstDefined(r.provider, r.PROVIDER) ?? "";
  const thumbnail =
    firstDefined(r.thumbnail, r.THUMBNAIL, r.image, r.IMAGE, r.icon, r.ICON) ??
    null;
  return { id, name, provider, thumbnail, _raw: r };
}

// Lê “order_index” com vários nomes possíveis
function readOrder(r) {
  return firstDefined(
    r.order_index, r.ORDER_INDEX,
    r.order, r.ORDER,
    r.position, r.POSITION,
    r.sort, r.SORT,
    r.order_idx, r.ORDER_IDX,
    r._raw?.order_index, r._raw?.order, r._raw?.position, r._raw?.sort, r._raw?.order_idx
  );
}

function normHuntSlotRow(r, catalogById) {
  const id = firstDefined(r.id, r.ID);
  const slotId =
    firstDefined(r.slot_id, r.SLOT_ID, r.slotId, r.SLOTID, r.slot, r.SLOT) ??
    null;

  const cat = slotId != null ? catalogById.get(slotId) : null;

  const bet_size = firstDefined(r.bet_size, r.bet, r.betsize, r.bet_value);
  const remaining_balance = firstDefined(
    r.remaining_balance, r.remaining, r.remain
  );
  const spins_used = firstDefined(r.spins_used, r.spins, r.spinsUsed);
  const payout = firstDefined(r.payout, r.PAYOUT);
  const multiplier = firstDefined(r.multiplier, r.MULTIPLIER);
  const order_index = Number(readOrder(r));

  const is_super = !!firstDefined(
    r.is_super, r.super, r.SUPER, r.IS_SUPER, r.super_bonus
  );

  return {
    id,
    slot_id: slotId,
    // catálogo
    name: cat?.name ?? "—",
    provider: cat?.provider ?? "—",
    thumbnail: cat?.thumbnail ?? null,
    // hunt_slots
    bet_size,
    remaining_balance,
    spins_used,
    payout,
    multiplier,
    order_index: Number.isFinite(order_index) ? order_index : undefined,
    is_super,
    _raw: r,
  };
}

/** tenta várias consultas até uma funcionar (evita 400 em colunas inexistentes) */
async function tryMany(variants) {
  let lastErr;
  for (const fn of variants) {
    try {
      const out = await fn();
      if (!out?.error) return out; // sucesso
      lastErr = out.error;
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  return { data: null, error: new Error("Falha desconhecida") };
}

/* -----------------------------------------------------------
   API pública
----------------------------------------------------------- */

/**
 * Lista as slots de um hunt (por numberId).
 * Retorna SEMPRE ordenado por order_index (quando existir), senão por id.
 */
export async function listHuntSlots({ numberId }) {
  const n = Number(numberId);
  if (!Number.isFinite(n) || n <= 0) return { slots: [] };

  // 1) Carregar hunt_slots do hunt
  let hs = [];
  let ok = false;

  // tenta já ordenar por order_index (se existir)
  for (const col of HUNT_COLS) {
    const { data, error } = await supabase
      .from("hunt_slots")
      .select("*")
      .eq(col, n)
      .order("order_index", { ascending: true, nullsFirst: false });
    if (!error) { hs = data || []; ok = true; break; }
  }

  // fallback: sem .order() e ordena no cliente
  if (!ok) {
    for (const col of HUNT_COLS) {
      const { data, error } = await supabase
        .from("hunt_slots")
        .select("*")
        .eq(col, n);
      if (!error) { hs = data || []; ok = true; break; }
    }
  }

  if (!ok) {
    const { data, error } = await supabase.from("hunt_slots").select("*");
    if (error) throw error;
    hs = (data || []).filter((r) => {
      const v =
        r.hunt_number_id ?? r.hunt_id ?? r.hunt_number ?? r.huntid ?? null;
      return Number(v) === n;
    });
  }

  if (!hs || hs.length === 0) return { slots: [] };

  // 2) Carregar catálogo (slots_catalog)
  const idsSet = new Set(
    hs
      .map((r) =>
        firstDefined(r.slot_id, r.SLOT_ID, r.slotId, r.SLOTID, r.slot, r.SLOT)
      )
      .filter((v) => v !== null && v !== undefined)
  );
  const ids = Array.from(idsSet);
  let catalogRows = [];

  if (ids.length > 0) {
    const { data: d1, error: e1 } = await supabase
      .from("slots_catalog")
      .select("*")
      .in("id", ids);
    if (!e1) {
      catalogRows = d1 || [];
    } else {
      const { data: d2, error: e2 } = await supabase
        .from("slots_catalog")
        .select("*")
        .in("ID", ids);
      if (!e2) {
        catalogRows = d2 || [];
      } else {
        const { data: d3, error: e3 } = await supabase
          .from("slots_catalog")
          .select("*");
        if (e3) throw e3;
        const idSet = new Set(ids.map((x) => String(x)));
        catalogRows = (d3 || []).filter((r) => {
          const idVal =
            firstDefined(r.id, r.ID, r.slot_id, r.SLOT_ID, r.slotId, r.SLOTID) ??
            null;
          return idSet.has(String(idVal));
        });
      }
    }
  }

  const catalogById = new Map();
  for (const r of catalogRows) {
    const ncat = normCatalogRow(r);
    if (!ncat) continue;
    catalogById.set(ncat.id, ncat);
    const nId = Number(ncat.id);
    if (Number.isFinite(nId)) catalogById.set(nId, ncat);
    catalogById.set(String(ncat.id), ncat);
  }

  const normalized = hs.map((r) => normHuntSlotRow(r, catalogById));

  // 3) Ordenar no cliente (garantia extra)
  normalized.sort((a, b) => {
    const aa = Number(readOrder(a));
    const bb = Number(readOrder(b));
    const aOk = Number.isFinite(aa);
    const bOk = Number.isFinite(bb);
    if (aOk && bOk) return aa - bb || a.id - b.id;
    if (aOk && !bOk) return -1;
    if (!aOk && bOk) return 1;
    return a.id - b.id;
  });

  return { slots: normalized };
}

/**
 * Pesquisa o catálogo de slots por nome/título.
 */
export async function searchCatalogSlots(q, { limit = 25 } = {}) {
  const query = String(q || "").trim();
  if (!query) return { slots: [] };

  const cols = ["name", "NAME", "title", "TITLE"];
  let rows = null;

  for (const col of cols) {
    const { data, error } = await supabase
      .from("slots_catalog")
      .select("*")
      .ilike(col, `%${query}%`)
      .limit(limit);
    if (!error) { rows = data || []; break; }
  }

  if (!rows) {
    const { data, error } = await supabase
      .from("slots_catalog")
      .select("*")
      .limit(200);
    if (error) throw error;
    const s = String(query).toLowerCase();
    rows = (data || []).filter((r) => {
      const n = normCatalogRow(r);
      return (
        n.name.toLowerCase().includes(s) ||
        (n.provider || "").toLowerCase().includes(s)
      );
    });
  }

  const slots = (rows || []).map(normCatalogRow);
  return { slots };
}

/**
 * Adiciona uma slot ao hunt.
 * payload: { slot_id, bet_size, remaining_balance?, spins_used?, super?, order_index? }
 */
export async function addHuntSlot(numberId, payload) {
  const sid = firstDefined(
    payload.slot_id, payload.slotId, payload.SLOT_ID, payload.slot
  );
  if (!sid) throw new Error("slot_id em falta.");

  const betVal = Number(
    firstDefined(payload.bet_size, payload.bet, payload.betsize)
  );
  if (!Number.isFinite(betVal)) throw new Error("Betsize inválida.");

  const remainVal = firstDefined(
    payload.remaining_balance, payload.remaining, payload.remain
  );
  const spinsVal = firstDefined(payload.spins_used, payload.spins);
  const superVal = firstDefined(
    payload.super, payload.is_super, payload.super_bonus
  );

  // se não vier order_index no payload, calcular (max + 1)
  let orderVal = firstDefined(
    payload.order_index, payload.order, payload.position, payload.sort, payload.order_idx
  );
  if (orderVal == null) orderVal = await getNextOrderIndex(numberId);
  orderVal = Number(orderVal);

  const variants = [
    { hunt: "hunt_number_id", bet: "bet_size",           remain: "remaining_balance", spins: "spins_used", slot: "slot_id" },
    { hunt: "hunt_id",        bet: "bet_size",           remain: "remaining_balance", spins: "spins_used", slot: "slot_id" },
    { hunt: "hunt_number_id", bet: "bet",                remain: "remaining_balance", spins: "spins",      slot: "slot_id" },
    { hunt: "hunt_id",        bet: "bet",                remain: "remaining",         spins: "spins",      slot: "slot_id" },
    { hunt: "hunt_id",        bet: "betsize",            remain: "remaining_balance", spins: "spins_used", slot: "slot_id" },
    { hunt: "hunt_number_id", bet: "betsize",            remain: "remaining",         spins: "spins",      slot: "slot_id" },
    { hunt: "hunt_number_id", bet: "bet_size",           remain: "remaining_balance", spins: "spins_used", slot: "SLOT_ID" },
    { hunt: "hunt_id",        bet: "bet",                remain: "remaining",         spins: "spins",      slot: "SLOT_ID" },
  ];

  let lastErr = null;
  for (const v of variants) {
    const baseRow = { [v.hunt]: numberId, [v.slot]: sid, [v.bet]: betVal };
    if (remainVal !== undefined && remainVal !== null) baseRow[v.remain] = remainVal;
    if (spinsVal  !== undefined && spinsVal  !== null) baseRow[v.spins]  = spinsVal;

    const attempts = [];
    attempts.push({ ...baseRow }); // sem super / sem order
    if (orderVal !== undefined && orderVal !== null) {
      for (const oc of ORDER_COLS) attempts.push({ ...baseRow, [oc]: Number(orderVal) });
    }
    if (superVal !== undefined && superVal !== null) {
      for (const sc of SUPER_COLS) attempts.push({ ...baseRow, [sc]: !!superVal });
    }
    if (superVal !== undefined && superVal !== null && orderVal !== undefined && orderVal !== null) {
      for (const sc of SUPER_COLS) for (const oc of ORDER_COLS)
        attempts.push({ ...baseRow, [sc]: !!superVal, [oc]: Number(orderVal) });
    }

    for (const row of attempts) {
      const { data, error } = await supabase.from("hunt_slots").insert([row]).select("*").single();
      if (!error) return data;
      lastErr = error;
    }
  }
  throw new Error(lastErr?.message || "Não foi possível inserir em hunt_slots.");
}

/** Atualiza um registo da tabela hunt_slots (não mexe na ordem aqui). */
export async function updateHuntSlot(rowId, patch) {
  const betVal    = firstDefined(patch.bet_size, patch.bet, patch.betsize);
  const remainVal = firstDefined(patch.remaining_balance, patch.remaining, patch.remain);
  const spinsVal  = firstDefined(patch.spins_used, patch.spins, patch.spinsUsed);
  const payoutVal = firstDefined(patch.payout, patch.PAYOUT);
  const multVal   = firstDefined(patch.multiplier, patch.MULTIPLIER);

  const variants = [
    { bet: "bet_size", remain: "remaining_balance", spins: "spins_used", payout: "payout", mult: "multiplier" },
    { bet: "bet",      remain: "remaining_balance", spins: "spins",      payout: "payout", mult: "multiplier" },
    { bet: "betsize",  remain: "remaining",         spins: "spins",      payout: "payout", mult: "multiplier" },
  ];

  const buildBody = (v) => {
    const b = {};
    if (betVal    !== undefined) b[v.bet]    = betVal;
    if (remainVal !== undefined) b[v.remain] = remainVal;
    if (spinsVal  !== undefined) b[v.spins]  = spinsVal;
    if (payoutVal !== undefined) b[v.payout] = payoutVal;
    if (multVal   !== undefined) b[v.mult]   = multVal;
    return b;
  };

  const tryFns = [];
  for (const v of variants) {
    const body = buildBody(v);
    tryFns.push(() => supabase.from("hunt_slots").update(body).eq("id", rowId).select("*").single());
  }
  for (const v of variants) {
    const body = buildBody(v);
    tryFns.push(() => supabase.from("hunt_slots").update(body).eq("ID", rowId).select("*").single());
  }

  const { data } = await tryMany(tryFns);
  return data;
}

export async function deleteHuntSlot(rowId) {
  const { error: e1 } = await supabase.from("hunt_slots").delete().eq("id", rowId);
  if (!e1) return;
  const { error: e2 } = await supabase.from("hunt_slots").delete().eq("ID", rowId);
  if (!e2) return;
  throw e2 || e1;
}

/* -----------------------------------------------------------
   Helpers públicos p/ o modal de edição
----------------------------------------------------------- */

export function getIsSuper(row) {
  return !!(
    row?.is_super ??
    row?.super ??
    row?.SUPER ??
    row?.IS_SUPER ??
    row?.super_bonus ??
    row?._raw?.is_super ??
    row?._raw?.super ??
    row?._raw?.super_bonus
  );
}

export async function updateSuperFlag(rowId, flag) {
  for (const col of SUPER_COLS) {
    let { error } = await supabase.from("hunt_slots").update({ [col]: !!flag }).eq("id", rowId);
    if (!error) return;
    ({ error } = await supabase.from("hunt_slots").update({ [col]: !!flag }).eq("ID", rowId));
    if (!error) return;
  }
}

/** Lê TODAS as variantes de ordem e devolve max + 1. */
export async function getNextOrderIndex(huntNumberId) {
  for (const col of HUNT_COLS) {
    const { data, error } = await supabase
      .from("hunt_slots")
      .select(ORDER_COLS.join(","))
      .eq(col, huntNumberId);
    if (!error) {
      const max = (data || []).reduce((m, r) => {
        const v = Number(
          r.order_index ?? r.order ?? r.position ?? r.sort ?? r.order_idx
        );
        return Number.isFinite(v) ? Math.max(m, v) : m;
      }, 0);
      return max + 1;
    }
  }
  return 1;
}

/**
 * Grava a nova ordem (order_index).
 * - 1º tenta RPC `set_hunt_order(p_hunt_number_id, p_ids)`
 * - fallback: update linha-a-linha em `order_index`
 * Recebe `rows` NA ORDEM desejada.
 */
export async function persistOrder(rows, huntNumberId) {
  if (!Array.isArray(rows) || rows.length === 0) return;

  const ids = rows
    .map(r => Number(r?.id ?? r?.ID ?? r?._raw?.id ?? r?._raw?.ID ?? r?._raw?.hunt_slot_id))
    .filter(Number.isFinite);

  // 1) Tenta RPC
  if (huntNumberId != null && ids.length > 0) {
    try {
      const { error } = await supabase.rpc("set_hunt_order", {
        p_hunt_number_id: Number(huntNumberId),
        p_ids: ids
      });
      if (!error) return;
    } catch {}
  }

  // 2) Fallback: update linha-a-linha em order_index
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const orderVal = i + 1;
    let { error } = await supabase.from("hunt_slots").update({ order_index: orderVal }).eq("id", id);
    if (error) {
      ({ error } = await supabase.from("hunt_slots").update({ order_index: orderVal }).eq("ID", id));
    }
    if (error) throw error;
  }
}

export default {
  listHuntSlots,
  searchCatalogSlots,
  addHuntSlot,
  updateHuntSlot,
  deleteHuntSlot,
  getIsSuper,
  updateSuperFlag,
  getNextOrderIndex,
  persistOrder,
};
