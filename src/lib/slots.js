// /src/lib/slots.js
import { supabase } from "@/lib/supabase";

/* -----------------------------------------------------------
   Helpers
----------------------------------------------------------- */

function firstDefined(...vals) {
  for (const v of vals) if (v !== undefined && v !== null) return v;
  return undefined;
}

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

function normHuntSlotRow(r, catalogById) {
  const id = firstDefined(r.id, r.ID);
  const slotId =
    firstDefined(r.slot_id, r.SLOT_ID, r.slotId, r.SLOTID, r.slot, r.SLOT) ??
    null;

  const cat = slotId != null ? catalogById.get(slotId) : null;

  const bet_size = firstDefined(r.bet_size, r.bet, r.betsize, r.bet_value);
  const remaining_balance = firstDefined(
    r.remaining_balance,
    r.remaining,
    r.remain
  );
  const spins_used = firstDefined(r.spins_used, r.spins, r.spinsUsed);
  const payout = firstDefined(r.payout, r.PAYOUT);
  const multiplier = firstDefined(r.multiplier, r.MULTIPLIER);

  // normalizar flag "super" com vários nomes possíveis
  const is_super = !!firstDefined(
    r.is_super,
    r.super,
    r.SUPER,
    r.IS_SUPER,
    r.super_bonus
  );

  return {
    id,
    slot_id: slotId,
    // dados do catálogo
    name: cat?.name ?? "—",
    provider: cat?.provider ?? "—",
    thumbnail: cat?.thumbnail ?? null,
    // dados de hunt_slots
    bet_size,
    remaining_balance,
    spins_used,
    payout,
    multiplier,
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
 * Evita 400 do Supabase quando o id é inválido e faz fallbacks de colunas.
 */
export async function listHuntSlots({ numberId }) {
  const n = Number(numberId);
  if (!Number.isFinite(n) || n <= 0) return { slots: [] };

  // 1) Carregar hunt_slots para o hunt indicado, tentando nomes de colunas comuns
  const huntColCandidates = ["hunt_number_id", "hunt_id", "hunt_number", "huntid"];

  let hs = [];
  let ok = false;
  for (const col of huntColCandidates) {
    const { data, error } = await supabase
      .from("hunt_slots")
      .select("*")
      .eq(col, n);

    if (!error) {
      hs = data || [];
      ok = true;
      break;
    }
  }

  if (!ok) {
    // último fallback: carregar todos e filtrar em JS
    const { data, error } = await supabase.from("hunt_slots").select("*");
    if (error) throw error;
    hs = (data || []).filter((r) => {
      const v =
        r.hunt_number_id ?? r.hunt_id ?? r.hunt_number ?? r.huntid ?? null;
      return Number(v) === n;
    });
  }

  if (!hs || hs.length === 0) return { slots: [] };

  // 2) Extrair os slot_ids e carregar os respetivos do catálogo
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
    // tentar .in('id', ...) e .in('ID', ...); se falhar, carrega e filtra
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

  // 3) Normalizar catálogo e construir map por id
  const catalogById = new Map();
  for (const r of catalogRows) {
    const ncat = normCatalogRow(r);
    if (!ncat) continue;
    // guardar por string e number para evitar mismatches
    catalogById.set(ncat.id, ncat);
    const nId = Number(ncat.id);
    if (Number.isFinite(nId)) catalogById.set(nId, ncat);
    catalogById.set(String(ncat.id), ncat);
  }

  // 4) Normalizar hunt_slots
  const normalized = hs.map((r) => normHuntSlotRow(r, catalogById));
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
    if (!error) {
      rows = data || [];
      break;
    }
  }

  // último fallback: carrega algumas e filtra em JS
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
 * payload: { slot_id, bet_size, remaining_balance?, spins_used?, super? }
 */
export async function addHuntSlot(numberId, payload) {
  const sid = firstDefined(
    payload.slot_id,
    payload.slotId,
    payload.SLOT_ID,
    payload.slot
  );
  if (!sid) throw new Error("slot_id em falta.");

  const betVal = firstDefined(payload.bet_size, payload.bet, payload.betsize);
  if (!(Number.isFinite(betVal) || typeof betVal === "number"))
    throw new Error("Betsize inválida.");

  const remainVal = firstDefined(
    payload.remaining_balance,
    payload.remaining,
    payload.remain
  );
  const spinsVal = firstDefined(payload.spins_used, payload.spins);
  const superVal = firstDefined(
    payload.super,
    payload.is_super,
    payload.super_bonus
  );

  // variações comuns de nomes de colunas
  const variants = [
    { hunt: "hunt_number_id", bet: "bet_size", remain: "remaining_balance", spins: "spins_used", slot: "slot_id" },
    { hunt: "hunt_id",        bet: "bet_size", remain: "remaining_balance", spins: "spins_used", slot: "slot_id" },
    { hunt: "hunt_number_id", bet: "bet",      remain: "remaining_balance", spins: "spins",      slot: "slot_id" },
    { hunt: "hunt_id",        bet: "bet",      remain: "remaining",         spins: "spins",      slot: "slot_id" },
    { hunt: "hunt_id",        bet: "betsize",  remain: "remaining_balance", spins: "spins_used", slot: "slot_id" },
    { hunt: "hunt_number_id", bet: "betsize",  remain: "remaining",         spins: "spins",      slot: "slot_id" },
    { hunt: "hunt_number_id", bet: "bet_size", remain: "remaining_balance", spins: "spins_used", slot: "SLOT_ID" },
    { hunt: "hunt_id",        bet: "bet",      remain: "remaining",         spins: "spins",      slot: "SLOT_ID" },
  ];

  const superCols = ["super", "is_super", "super_bonus"];
  let lastErr = null;

  for (const v of variants) {
    // 1) tenta inserir sem o campo "super"
    {
      const row = { [v.hunt]: numberId, [v.slot]: sid, [v.bet]: betVal };
      if (remainVal !== undefined && remainVal !== null) row[v.remain] = remainVal;
      if (spinsVal  !== undefined && spinsVal  !== null) row[v.spins]  = spinsVal;

      const { data, error } = await supabase
        .from("hunt_slots")
        .insert([row])
        .select("*")
        .single();
      if (!error) return data;
      lastErr = error;
    }

    // 2) se temos valor para super, tenta com cada nome de coluna
    if (superVal !== undefined && superVal !== null) {
      for (const sCol of superCols) {
        const row = {
          [v.hunt]: numberId,
          [v.slot]: sid,
          [v.bet]: betVal,
          [sCol]: !!superVal,
        };
        if (remainVal !== undefined && remainVal !== null) row[v.remain] = remainVal;
        if (spinsVal  !== undefined && spinsVal  !== null) row[v.spins]  = spinsVal;

        const { data, error } = await supabase
          .from("hunt_slots")
          .insert([row])
          .select("*")
          .single();
        if (!error) return data;
        lastErr = error;
      }
    }
  }

  throw new Error(
    lastErr?.message || "Não foi possível inserir em hunt_slots."
  );
}

/** Atualiza um registo da tabela hunt_slots (com fallbacks) */
export async function updateHuntSlot(rowId, patch) {
  const betVal     = firstDefined(patch.bet_size, patch.bet, patch.betsize);
  const remainVal  = firstDefined(patch.remaining_balance, patch.remaining, patch.remain);
  const spinsVal   = firstDefined(patch.spins_used, patch.spins, patch.spinsUsed);
  const payoutVal  = firstDefined(patch.payout, patch.PAYOUT);
  const multVal    = firstDefined(patch.multiplier, patch.MULTIPLIER);

  const variants = [
    { bet: "bet_size", remain: "remaining_balance", spins: "spins_used", payout: "payout", mult: "multiplier" },
    { bet: "bet",      remain: "remaining_balance", spins: "spins",      payout: "payout", mult: "multiplier" },
    { bet: "betsize",  remain: "remaining",         spins: "spins",      payout: "payout", mult: "multiplier" },
  ];

  const buildBody = (v) => {
    const b = {};
    if (betVal     !== undefined) b[v.bet]     = betVal;
    if (remainVal  !== undefined) b[v.remain]  = remainVal;
    if (spinsVal   !== undefined) b[v.spins]   = spinsVal;
    if (payoutVal  !== undefined) b[v.payout]  = payoutVal;
    if (multVal    !== undefined) b[v.mult]    = multVal;
    return b;
  };

  const tryFns = [];
  for (const v of variants) {
    const body = buildBody(v);
    tryFns.push(() =>
      supabase.from("hunt_slots").update(body).eq("id", rowId).select("*").single()
    );
  }
  for (const v of variants) {
    const body = buildBody(v);
    tryFns.push(() =>
      supabase.from("hunt_slots").update(body).eq("ID", rowId).select("*").single()
    );
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

/** Lê o estado "super" do registo (aceita várias colunas ou _raw) */
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

/** Atualiza a flag "super" tentando diferentes nomes de coluna; ignora caso não exista. */
export async function updateSuperFlag(rowId, flag) {
  const colNames = ["is_super", "super", "super_bonus"];

  // tenta (id) e (ID) para cada nome de coluna
  for (const col of colNames) {
    let { error } = await supabase
      .from("hunt_slots")
      .update({ [col]: !!flag })
      .eq("id", rowId);
    if (!error) return;

    ({ error } = await supabase
      .from("hunt_slots")
      .update({ [col]: !!flag })
      .eq("ID", rowId));
    if (!error) return;
  }
  // se não conseguiu (coluna não existe), não falha a operação
}

/* Default export opcional */
export default {
  listHuntSlots,
  searchCatalogSlots,
  addHuntSlot,
  updateHuntSlot,
  deleteHuntSlot,
  getIsSuper,
  updateSuperFlag,
};
