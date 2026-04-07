import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
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
