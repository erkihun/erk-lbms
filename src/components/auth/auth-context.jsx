// src/pages/auth/auth-context.jsx
"use client";
import { createContext } from "react";

export const AuthContext = createContext({
  user: null,
  loading: true,
  error: null,
  login: async () => {},
  logout: async () => {},
  clearError: () => {},
  isAuthenticated: false,
  isAdmin: false,
  isLibrarian: false,
});
