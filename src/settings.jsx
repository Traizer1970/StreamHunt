// src/Settings.jsx
import React, { useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Upload, Save, Image as ImageIcon, Mail, User, Lock } from "lucide-react";
import { AuthCtx } from "@/contexts/auth-context";

const fieldCls =
  "w-full h-11 rounded-xl px-4 bg-zinc-100 text-zinc-900 placeholder:text-zinc-500 " +
  "dark:bg-zinc-800 dark:text-white dark:placeholder:text-white/50 border border-transparent focus-visible:ring-2 focus-visible:ring-amber-500";

const cardCls =
  "rounded-2xl border dark:border-white/10 border-zinc-200 " +
  "bg-white/70 dark:bg-white/[0.04] backdrop-blur p-5";

const btnDark =
  "inline-flex items-center gap-2 px-4 py-2 rounded-xl " +
  "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white/10 dark:hover:bg-white/15 " +
  "border border-zinc-800 dark:border-white/10";

export default function Settings() {
  const { user, profile, refreshProfile } = useContext(AuthCtx);

  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Email (current + new)
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // Password (current + new + confirm)
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  // { ok: boolean, m: string } | null
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    setUsername(
      (profile && profile.username) ||
        (user && user.user_metadata && user.user_metadata.full_name) ||
        (user && user.email && user.email.split("@")[0]) ||
        ""
    );
    setAvatarUrl((profile && profile.avatar_url) || "");
    setCurrentEmail((user && user.email) || "");
  }, [user, profile]);

  const info = (m) => setMsg({ ok: true, m });
  const err = (m) => setMsg({ ok: false, m });

  /* ---------- Update username / avatar ---------- */
  const saveProfile = async () => {
    try {
      if (!user) throw new Error("You must be signed in.");
      const { error } = await supabase
        .from("profiles")
        .update({
          username: username || null,
          avatar_url: avatarUrl || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      info("Profile updated.");
    } catch (e) {
      err(e.message || "Failed to update profile.");
    }
  };

  /* ---------- Upload avatar (bucket: avatars) ---------- */
  const uploadAvatar = async (file) => {
    try {
      if (!file) return;
      if (!user) throw new Error("You must be signed in.");

      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      if (!data || !data.publicUrl) throw new Error("Could not get public URL for the avatar.");

      setAvatarUrl(data.publicUrl);
      info("Avatar uploaded.");
    } catch (e) {
      err(e.message || "Failed to upload the avatar.");
    }
  };

  /* ---------- Update email (requires current + new) ---------- */
  const saveEmail = async () => {
    try {
      if (!user) throw new Error("You must be signed in.");

      const cur = (currentEmail || "").trim().toLowerCase();
      const sessionEmail = (user.email || "").trim().toLowerCase();
      const next = (newEmail || "").trim();

      if (!cur || !next) throw new Error("Please fill both current and new email.");
      if (cur !== sessionEmail) throw new Error("Current email does not match your account email.");
      if (next.toLowerCase() === sessionEmail)
        throw new Error("New email must be different from the current email.");

      // very light validation
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(next)) throw new Error("Please enter a valid email address.");

      const { error } = await supabase.auth.updateUser({ email: next });
      if (error) throw error;

      info("Email update requested. Check your inbox to confirm the change.");
    } catch (e) {
      err(e.message || "Failed to update email.");
    }
  };

  /* ---------- Update password (requires current + new + confirm) ---------- */
  const savePassword = async () => {
    try {
      if (!user) throw new Error("You must be signed in.");
      if (!oldPassword) throw new Error("Current password is required.");
      if (!password || password.length < 6)
        throw new Error("New password must be at least 6 characters.");
      if (password !== password2) throw new Error("New passwords do not match.");

      // Validate current password
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });
      if (loginErr) throw new Error("Current password is incorrect.");

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setOldPassword("");
      setPassword("");
      setPassword2("");
      info("Password updated.");
    } catch (e) {
      err(e.message || "Failed to update password.");
    }
  };

  return (
    <section className="py-10 md:py-14">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-6">
          Settings
        </h1>

        {msg && (
          <div
            className={`mb-5 rounded-xl px-4 py-3 text-sm ${
              msg.ok
                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                : "bg-red-500/10 text-red-300 border border-red-500/30"
            }`}
          >
            {msg.m}
          </div>
        )}

        {/* Profile */}
        <div className={cardCls}>
          <div className="font-semibold mb-3 flex items-center gap-2">
            <User className="h-4 w-4" /> Profile
          </div>

          <div className="flex items-center gap-4 mb-4">
            {/* Avatar preview */}
            <div className="h-16 w-16 rounded-full overflow-hidden bg-zinc-800 border border-white/10 shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full grid place-items-center text-white/60">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <label className="inline-flex items-center px-3 py-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-800 cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                <span>Upload photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => uploadAvatar(e.target.files && e.target.files[0])}
                />
              </label>

              <input
                type="text"
                placeholder="Paste image URL"
                className={fieldCls + " sm:w-80"}
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
            </div>
          </div>

          <label className="block text-sm mb-1">Username</label>
          <input
            className={fieldCls}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />

          <button onClick={saveProfile} className={btnDark + " mt-4"}>
            <Save className="h-4 w-4" /> Save profile
          </button>
        </div>

        {/* Email (current + new) */}
        <div className={cardCls + " mt-6"}>
          <div className="font-semibold mb-3 flex items-center gap-2">
            <Mail className="h-4 w-4" /> Email
          </div>

          <label className="block text-sm mb-1">Current email</label>
          <input
            type="email"
            className={fieldCls + " mb-3"}
            value={currentEmail}
            onChange={(e) => setCurrentEmail(e.target.value)}
            placeholder="your.current@email.com"
          />

          <label className="block text-sm mb-1">New email</label>
          <input
            type="email"
            className={fieldCls}
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="your.new@email.com"
          />

          <button onClick={saveEmail} className={btnDark + " mt-4"}>
            <Save className="h-4 w-4" /> Save email
          </button>
        </div>

        {/* Password (current + new + confirm) */}
        <div className={cardCls + " mt-6"}>
          <div className="font-semibold mb-3 flex items-center gap-2">
            <Lock className="h-4 w-4" /> Password
          </div>

          <label className="block text-sm mb-1">Current password</label>
          <input
            type="password"
            className={fieldCls + " mb-3"}
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="Current password"
          />

          <label className="block text-sm mb-1">New password</label>
          <input
            type="password"
            className={fieldCls + " mb-3"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
          />

          <label className="block text-sm mb-1">Confirm new password</label>
          <input
            type="password"
            className={fieldCls}
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            placeholder="Repeat new password"
          />

          <button onClick={savePassword} className={btnDark + " mt-4"}>
            <Save className="h-4 w-4" /> Update password
          </button>
        </div>
      </div>
    </section>
  );
}
