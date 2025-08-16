import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { memo } from "react";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import PatientsPage from "@/pages/patients";
import PatientProfile from "@/pages/patient-profile";
import AppointmentsPage from "@/pages/appointments";
import VisitsPage from "@/pages/visits";
import BillingPage from "@/pages/billing";
import AdminPage from "@/pages/admin";
import Sidebar from "@/components/sidebar";
import { useUser } from "@/hooks/use-auth";
import { LanguageProvider, useLanguage } from "@/components/language-provider";
import { useIsMobile } from "@/hooks/use-mobile";

const AppContent = memo(function AppContent() {
  const { user, isLoading } = useUser();
  const { t, isRTL } = useLanguage();
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto gpu-accelerated"></div>
          <p className="text-muted-foreground">
            {t('common.loading')}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className={`min-h-screen bg-background flex ${isRTL ? 'rtl' : 'ltr'}`}>
      <Sidebar />
      <main 
        className={`flex-1 overflow-auto ${isMobile ? 'pt-16' : ''}`}
        role="main" 
        aria-label="Main content"
      >
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/patients" component={PatientsPage} />
          <Route path="/patients/:id" component={PatientProfile} />
          <Route path="/appointments" component={AppointmentsPage} />
          <Route path="/visits" component={VisitsPage} />
          <Route path="/billing" component={BillingPage} />
          <Route path="/admin" component={AdminPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Toaster />
    </div>
  );
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;