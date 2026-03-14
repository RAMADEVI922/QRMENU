import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import CustomerMenu from "./pages/CustomerMenu.tsx";
import SessionSelection from "./pages/SessionSelection.tsx";
import AdminPanel from "./pages/AdminPanel.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import AdminSignUp from "./pages/AdminSignUp.tsx";
import WaiterPanel from "./pages/WaiterPanel.tsx";
import OrderSummaryPage from "./pages/OrderSummaryPage.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import { useFirebaseSync } from "./lib/useFirebaseSync";

const queryClient = new QueryClient();

const App = () => {
  useFirebaseSync();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/table-session" element={<SessionSelection />} />
        <Route path="/menu/:tableId" element={<CustomerMenu />} />
        <Route path="/order-summary/:tableId" element={<OrderSummaryPage />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin-signup" element={<AdminSignUp />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
        <Route path="/waiter" element={<WaiterPanel />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
