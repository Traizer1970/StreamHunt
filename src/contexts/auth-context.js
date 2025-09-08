// src/contexts/auth-context.jsx
import React, { createContext, useContext } from "react";

/* -------- Theme -------- */
export const ThemeCtx = createContext({ isDark: true, toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);

/* -------- Auth -------- */
export const AuthCtx = createContext({
  user: null,
  profile: null,
  refreshProfile: async () => {},
});
export const useAuth = () => useContext(AuthCtx);
