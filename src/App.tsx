import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Component, lazy, Suspense } from "react";
import Index from "@/pages/Index";
import { RouteSeo } from "@/components/RouteSeo";


const Auth = lazy(() => import("@/pages/Auth"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Settings = lazy(() => import("@/pages/Settings"));
const Features = lazy(() => import("@/pages/Features"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const Security = lazy(() => import("@/pages/Security"));
const Developers = lazy(() => import("@/pages/Developers"));
const Docs = lazy(() => import("@/pages/Docs"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Solutions = lazy(() => import("@/pages/Solutions"));
const HelpCenter = lazy(() => import("@/pages/HelpCenter"));
const Status = lazy(() => import("@/pages/Status"));
const Changelog = lazy(() => import("@/pages/Changelog"));
const Admin = lazy(() => import("@/pages/Admin"));
const TelegramMiniApp = lazy(() => import("@/pages/TelegramMiniApp"));
const OAuthAuthorize = lazy(() => import("@/pages/OAuthAuthorize"));
const OAuthConsent = lazy(() => import("@/pages/OAuthConsent"));

const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="h-screen flex items-center justify-center bg-background">
    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

class AppErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("AfuChat Mail render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
            <h1 className="text-lg font-semibold">AfuChat Mail could not load</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The workspace encountered an unexpected error while loading. Refresh the page to reconnect to Supabase.
            </p>
            {this.state.error.message && (
              <p className="mt-3 rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
                {this.state.error.message}
              </p>
            )}
            <button
              className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              onClick={() => window.location.reload()}
            >
              Reload workspace
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="afuchat-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <RouteSeo />
          <AppErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>

              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/features" element={<Features />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/security" element={<Security />} />
              <Route path="/developers" element={<Developers />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/solutions" element={<Solutions />} />
              <Route path="/help" element={<HelpCenter />} />
              <Route path="/status" element={<Status />} />
              <Route path="/changelog" element={<Changelog />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/telegram" element={<TelegramMiniApp />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
              <Route path="/oauth/authorize" element={<OAuthAuthorize />} />

              <Route path="/oauth/auth" element={<OAuthAuthorize />} />
              <Route path="/oauth" element={<OAuthAuthorize />} />
              <Route path="/oauth/*" element={<OAuthAuthorize />} />
              <Route path="/authorize" element={<OAuthAuthorize />} />
              <Route path="/o/oauth2/auth" element={<OAuthAuthorize />} />
              <Route path="/o/oauth2/authorize" element={<OAuthAuthorize />} />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AppErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </HelmetProvider>
);


export default App;
