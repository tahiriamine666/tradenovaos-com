import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PlanProvider } from "@/hooks/usePlan";
import { ProfileProvider } from "@/hooks/useProfile";
import { ActiveAccountProvider } from "@/contexts/ActiveAccountContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import ResetPassword from "./pages/ResetPassword.tsx";
import Index from "./pages/Index.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import RequireAccess from "@/components/RequireAccess";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import LandingPage from "./pages/LandingPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import SupportedBrokersPage from "./pages/SupportedBrokersPage.tsx";
import Pricing from "./pages/Pricing.tsx";
import SeoHead from "@/components/SeoHead";
import { monthlyPlanPrice } from "@/lib/pricing";
import MarketingPlaceholder from "./pages/marketing/MarketingPlaceholder.tsx";
import { FeaturePage, SolutionPage, BlogPage, HelpCenterPage } from "./pages/marketing/MarketingPages.tsx";
import FairValueGapsGuide from "./pages/blog/FairValueGapsGuide.tsx";
import EducationalArticle from "./pages/blog/EducationalArticle";
import { BLOG_ARTICLES, articlePath } from "./pages/blog/articles";
import BillingSuccess from "./pages/BillingSuccess.tsx";
import BillingCancel from "./pages/BillingCancel.tsx";
import Billing from "./pages/Billing.tsx";
import CookiePolicy from "./pages/CookiePolicy";
import CookieConsentPanel from "@/components/CookieConsent";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";

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
        <CookieConsentProvider>
        <AuthProvider>
          <ProfileProvider>
            <PlanProvider>
              <ActiveAccountProvider>
                <Routes>
                  <Route path="/" element={<PublicOnly><LandingPage /></PublicOnly>} />
                  <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
                  <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route
                    path="/app"
                    element={
                      <RequireAccess>
                        <Index />
                      </RequireAccess>
                    }
                  />
                  <Route path="/app/admin" element={<Navigate to="/app?view=admin" replace />} />
                  <Route path="/onboarding" element={<ProtectedApp><Onboarding /></ProtectedApp>} />
                  <Route path="/dashboard" element={<Navigate to="/app" replace />} />

                  <Route path="/billing" element={<ProtectedApp><Billing /></ProtectedApp>} />
                  <Route path="/billing/success" element={<ProtectedApp><BillingSuccess /></ProtectedApp>} />
                  <Route path="/billing/cancel" element={<ProtectedApp><BillingCancel /></ProtectedApp>} />
                  <Route path="/checkout" element={<Navigate to="/onboarding?step=plan" replace />} />


                  {/* Public marketing routes */}
                  <Route path="/pricing" element={<><SeoHead path="/pricing" title="Pricing — TradeNova OS plans for every trader" description={`Compare TradeNova Pro (${monthlyPlanPrice('pro')}/mo) and Elite (${monthlyPlanPrice('elite')}/mo). Start a 14-day free trial — journal, trade plans, analytics, psychology score and NOVA AI.`} /><Pricing /></>} />
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
                  <Route path="/blog/fair-value-gaps-guide" element={<FairValueGapsGuide />} />
                  {BLOG_ARTICLES.filter(article => article.body).map(article => (
                    <Route key={article.slug} path={articlePath(article)} element={<EducationalArticle slug={article.slug} />} />
                  ))}
                  <Route path="/contact" element={<MarketingPlaceholder group="static" staticKey="contact" />} />
                  <Route path="/careers" element={<MarketingPlaceholder group="static" staticKey="careers" />} />
                  <Route path="/privacy" element={<MarketingPlaceholder group="static" staticKey="privacy" />} />
                  <Route path="/cookies" element={<CookiePolicy />} />
                  <Route path="/terms" element={<MarketingPlaceholder group="static" staticKey="terms" />} />
                  <Route path="/help" element={<MarketingPlaceholder group="static" staticKey="help" />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ActiveAccountProvider>
            </PlanProvider>
          </ProfileProvider>
        </AuthProvider>
        <CookieConsentPanel />
        </CookieConsentProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
