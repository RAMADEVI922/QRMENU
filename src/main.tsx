import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/react";
import App from "./App.tsx";
import "./index.css";
// Import debug utilities to make them available in browser console
import "./lib/debugUtils";
import "./lib/tableIssueDiagnostic";
import "./lib/migrationUtils";
import "./lib/firebaseQuotaMonitor";
import "./lib/clerkDiagnostics";
import { enableOfflineMode } from "./lib/offlineMode";

// IMPORTANT: Offline mode is disabled by default
// Use Firebase as primary, offline storage only as fallback on errors
// To manually enable offline mode for testing:
// __offlineMode.enable()
// To disable and use Firebase:
// __offlineMode.disable()

// Ensure light theme is applied by default (no dark mode by default)
const root = document.getElementById("root");
if (root) {
  root.classList.remove("dark");
}

// Suppress Clerk development warnings in console
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = function(...args: any[]) {
    // Suppress Clerk development key warnings
    if (args[0]?.includes?.('development keys') || args[0]?.includes?.('Clerk')) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

createRoot(root!).render(
  <BrowserRouter
    basename="/QRMENU/"
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/QRMENU/"
      appearance={{
        baseTheme: undefined,
      }}
    >
      <App />
    </ClerkProvider>
  </BrowserRouter>
);
