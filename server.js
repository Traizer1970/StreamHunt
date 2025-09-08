// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5174;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Falta SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Util: encontra um user por email (varre páginas se preciso) */
async function findUserByEmail(email) {
  let page = 1;
  const perPage = 200; // máx. permitido
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < perPage) break;
    page++;
  }
  return null;
}

/** Registo: cria user já confirmado e upsert no profiles */
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, username } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email e password são obrigatórios" });

    // tenta criar
    let user;
    try {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username: username || "" },
      });
      if (error) throw error;
      user = data.user;
    } catch (e) {
      // se já existe, vamos buscá-lo e forçamos confirmação + password
      if ((e?.message || "").toLowerCase().includes("already")) {
        user = await findUserByEmail(email);
        if (!user) throw e;
        await admin.auth.admin.updateUserById(user.id, {
          email_confirm: true,
          password,
          user_metadata: { ...(user.user_metadata || {}), username: username || user.user_metadata?.username || "" },
        });
      } else {
        throw e;
      }
    }

    // garantir profiles
    await admin.from("profiles").upsert(
      { id: user.id, username: username || (user.email || "").split("@")[0] },
      { onConflict: "id" }
    );

    res.json({ ok: true, userId: user.id });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Falha a criar utilizador" });
  }
});

/** Login helper: força confirmação e password para este email */
app.post("/api/auth/ensure", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email e password são obrigatórios" });

    let user = await findUserByEmail(email);

    if (!user) {
      // se não existir, criamos logo confirmado
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw error;
      user = data.user;
    } else {
      // se existir, confirmamos e alinhamos a password
      await admin.auth.admin.updateUserById(user.id, {
        email_confirm: true,
        password,
      });
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Falha no ensure" });
  }
});

app.listen(PORT, () => console.log(`API a ouvir em http://localhost:${PORT}`));
