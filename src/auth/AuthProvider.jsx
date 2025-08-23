import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, safeSignOut } from "@/lib/supabase";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const login = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const register = (email, password, extra = {}) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: extra }  // guarda nome/handle no user metadata
    });

  const logout = () => safeSignOut();

  return (
    <AuthCtx.Provider value={{ user, authLoading, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
