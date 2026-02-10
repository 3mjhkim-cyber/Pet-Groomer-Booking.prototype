import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/Navbar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Booking from "@/pages/Booking";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import Calendar from "@/pages/Calendar";
import Deposit from "@/pages/Deposit";
import PlatformAdmin from "@/pages/PlatformAdmin";
import ShopSettings from "@/pages/ShopSettings";
import Approvals from "@/pages/Approvals";
import Revenue from "@/pages/Revenue";
import NotFound from "@/pages/not-found";
import type { ComponentType } from "react";

function AuthGuard({ component: Component }: { component: ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/book/:slug" component={Booking} />
          <Route path="/admin/dashboard">{() => <AuthGuard component={Dashboard} />}</Route>
          <Route path="/admin/customers">{() => <AuthGuard component={Customers} />}</Route>
          <Route path="/admin/calendar">{() => <AuthGuard component={Calendar} />}</Route>
          <Route path="/admin/settings">{() => <AuthGuard component={ShopSettings} />}</Route>
          <Route path="/admin/revenue">{() => <AuthGuard component={Revenue} />}</Route>
          <Route path="/admin/platform">{() => <AuthGuard component={PlatformAdmin} />}</Route>
          <Route path="/admin/approvals">{() => <AuthGuard component={Approvals} />}</Route>
          <Route path="/deposit/:id" component={Deposit} />
          <Route component={NotFound} />
        </Switch>
      </main>

      <MobileBottomNav />

      <footer className="hidden md:block py-6 text-center text-muted-foreground text-sm border-t border-border bg-white">
        <p>&copy; 2024 정리하개. All rights reserved.</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}

export default App;
