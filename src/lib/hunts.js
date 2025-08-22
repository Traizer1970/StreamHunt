// /src/lib/hunts.js
import { supabase } from "@/lib/supabase";

/* Lista hunts do utilizador */
export async function listHunts({ page = 1, pageSize = 50 } = {}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from("bonus_hunts")
    .select(`id, number_id, title, start_cost, winnings, bonuses_count, user_id, created_at`)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { hunts: data || [] };
}

/* Cria um hunt */
export async function createHunt({ title, start_cost }) {
  const { data: userData, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const uid = userData?.user?.id;
  if (!uid) throw new Error("É necessário iniciar sessão.");

  const { data, error } = await supabase
    .from("bonus_hunts")
    .insert([{ user_id: uid, title, start_cost }])
    .select(`id, number_id, title, start_cost, winnings, bonuses_count, user_id, created_at`)
    .single();

  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("policy") || error.code === "42501") {
      throw new Error("Limite atingido no plano Free. Faz upgrade para criar mais Bonus Hunts.");
    }
    throw error;
  }
  return data;
}

/* Lê um hunt pelo number_id (fallback para id) */
export async function getHuntByNumberId(numberId) {
  const n = Number(numberId);
  if (!Number.isFinite(n) || n <= 0) return { hunt: null };

  // tenta por number_id
  let { data, error } = await supabase
    .from("bonus_hunts")
    .select(`id, number_id, title, start_cost, winnings, bonuses_count, user_id, created_at`)
    .eq("number_id", n)
    .limit(1)
    .single();

  if (!error && data) return { hunt: data };

  // fallback por id
  ({ data, error } = await supabase
    .from("bonus_hunts")
    .select(`id, number_id, title, start_cost, winnings, bonuses_count, user_id, created_at`)
    .eq("id", n)
    .limit(1)
    .single());

  if (!error && data) return { hunt: data };

  // sem erro, sem dados → {hunt:null}; se houve erro, lança
  if (error && error.code && error.code !== "PGRST116") throw error;
  return { hunt: null };
}

/* Atualiza um hunt */
export async function updateHunt(huntId, patch) {
  const { data, error } = await supabase
    .from("bonus_hunts")
    .update(patch)
    .eq("id", huntId)
    .select(`id, number_id, title, start_cost, winnings, bonuses_count, user_id, created_at`)
    .single();

  if (error) throw error;
  return data;
}

/* Apaga um hunt */
export async function deleteHunt(huntId) {
  const { error } = await supabase.from("bonus_hunts").delete().eq("id", huntId);
  if (error) throw error;
}

/* Opcional */
export async function addBonusItem(huntId, { game, bet_size, payout }) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData?.user?.id;

  const { error } = await supabase
    .from("bonus_items")
    .insert([{ hunt_id: huntId, user_id: uid, game, bet_size, payout }]);
  if (error) throw error;

  const { data: items, error: itemsErr } = await supabase
    .from("bonus_items")
    .select("payout")
    .eq("hunt_id", huntId);
  if (itemsErr) throw itemsErr;

  const total = (items || []).reduce((s, it) => s + Number(it.payout || 0), 0);
  const { error: upErr } = await supabase
    .from("bonus_hunts")
    .update({ winnings: total })
    .eq("id", huntId);
  if (upErr) throw upErr;
}

export default {
  listHunts,
  createHunt,
  getHuntByNumberId,
  updateHunt,
  deleteHunt,
  addBonusItem,
};
