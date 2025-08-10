import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect, createContext } from "react";
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

// Language context
export const LanguageContext = createContext({
  language: 'ar',
  direction: 'rtl',
  setLanguage: (lang: string) => {},
});

function AppContent() {
  const [language, setLanguage] = useState('ar');
  const [direction, setDirection] = useState('rtl');
  const { user, isLoading } = useUser();

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', direction);
  }, [language, direction]);

  const handleSetLanguage = (lang: string) => {
    setLanguage(lang);
    setDirection(lang === 'ar' ? 'rtl' : 'ltr');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <LanguageContext.Provider value={{ language, direction, setLanguage: handleSetLanguage }}>
      <div className="min-h-screen bg-background flex" dir={direction}>
        <Sidebar />
        <main className="flex-1 overflow-auto">
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
    </LanguageContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
