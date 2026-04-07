import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "./components/ui/sonner";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import HomePage from "./pages/HomePage";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import PortalPage from "./pages/PortalPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import FarmEquipmentPage from "./pages/FarmEquipmentPage";
import QuoteViewPage from "./pages/QuoteViewPage";
import ClientPortalPage from "./pages/ClientPortalPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RootRoute() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const legacyPortalRequested = searchParams.get("portal") === "1";
  const recoveryRequested =
    searchParams.get("reset") === "1" ||
    searchParams.get("type") === "recovery" ||
    Boolean(searchParams.get("access_token") && searchParams.get("refresh_token"));

  if (recoveryRequested) {
    return <Navigate to={`/reset-password${location.search}${location.hash}`} replace />;
  }

  if (legacyPortalRequested) {
    const mode =
      searchParams.get("mode") ||
      searchParams.get("auth") ||
      (searchParams.get("signup") === "1" ? "signup" : "signin");

    return <Navigate to={`/auth?mode=${mode}`} replace />;
  }

  return <HomePage />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/portal" element={<PortalPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/farm-equipment" element={<FarmEquipmentPage />} />
            <Route path="/quote/view" element={<QuoteViewPage />} />
            <Route path="/client-portal" element={<ClientPortalPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
