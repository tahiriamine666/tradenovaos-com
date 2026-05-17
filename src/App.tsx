import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PlanProvider } from "@/hooks/usePlan";
import { ProfileProvider } from "@/hooks/useProfile";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import LandingPage from "./pages/LandingPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import AIChatWidget from "@/components/AIChatWidget";
import SupportedBrokersPage from "./pages/SupportedBrokersPage.tsx";
import PublicPricingPage from "./pages/marketing/PublicPricingPage.tsx";
import MarketingPlaceholder from "./pages/marketing/MarketingPlaceholder.tsx";
import { FeaturePage, SolutionPage, BlogPage, HelpCenterPage } from "./pages/marketing/MarketingPages.tsx";
import BillingSuccess from "./pages/BillingSuccess.tsx";
import BillingCancel from "./pages/BillingCancel.tsx";

const queryClient = new QueryClient();

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (user) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function ProtectedApp({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ProfileProvider>
            <PlanProvider>
              <Routes>
                <Route path="/" element={<PublicOnly><LandingPage /></PublicOnly>} />
                <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
                <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
                <Route
                  path="/app"
                  element={
                    <ProtectedApp>
                      <Index />
                    </ProtectedApp>
                  }
                />
                <Route path="/dashboard" element={<Navigate to="/app" replace />} />

                <Route path="/billing/success" element={<ProtectedApp><BillingSuccess /></ProtectedApp>} />
                <Route path="/billing/cancel" element={<ProtectedApp><BillingCancel /></ProtectedApp>} />

                {/* Public marketing routes */}
                <Route path="/pricing" element={<PublicPricingPage />} />
                <Route path="/supported-brokers" element={<SupportedBrokersPage />} />
                <Route path="/features/:feature" element={<FeaturePage />} />
                <Route path="/solutions/:solution" element={<SolutionPage />} />
                <Route path="/resources/blog" element={<BlogPage />} />
                <Route path="/resources/help-center" element={<HelpCenterPage />} />
                <Route path="/products/:slug" element={<MarketingPlaceholder group="product" />} />
                <Route path="/solutions/:slug" element={<MarketingPlaceholder group="solution" />} />
                <Route path="/resources/:slug" element={<MarketingPlaceholder group="resource" />} />
                <Route path="/compare/:slug" element={<MarketingPlaceholder group="compare" />} />
                <Route path="/blog" element={<MarketingPlaceholder group="static" staticKey="blog" />} />
                <Route path="/contact" element={<MarketingPlaceholder group="static" staticKey="contact" />} />
                <Route path="/careers" element={<MarketingPlaceholder group="static" staticKey="careers" />} />
                <Route path="/privacy" element={<MarketingPlaceholder group="static" staticKey="privacy" />} />
                <Route path="/terms" element={<MarketingPlaceholder group="static" staticKey="terms" />} />
                <Route path="/help" element={<MarketingPlaceholder group="static" staticKey="help" />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
              <AIChatWidget />
            </PlanProvider>
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
