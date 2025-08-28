"use client";

import { LoginForm } from "./components/auth/login-form";
import { AppLayout } from "./components/layout/app-layout";
//import { AuthProvider, useAuth } from "./components/auth/auth-context";
import { AuthProvider } from "./components/auth/auth-provider";
import { useAuth } from "./components/auth/use-auth";

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <AppLayout /> : <LoginForm />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
