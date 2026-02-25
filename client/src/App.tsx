import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/Navbar";
import { MobileBottomNav } from "@/components/MobileBottomNav";

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
import Revenue from "@/pages/Revenue";
import Subscription from "@/pages/Subscription";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentFail from "@/pages/PaymentFail";
import NotFound from "@/pages/not-found";

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
          <Route path="/admin/dashboard" component={Dashboard} />
          <Route path="/admin/customers" component={Customers} />
          <Route path="/admin/calendar" component={Calendar} />
          <Route path="/admin/settings" component={ShopSettings} />
          <Route path="/admin/revenue" component={Revenue} />
          <Route path="/admin/subscription" component={Subscription} />
          <Route path="/admin/platform" component={PlatformAdmin} />
          <Route path="/deposit/:id" component={Deposit} />
          <Route path="/payment/success" component={PaymentSuccess} />
          <Route path="/payment/fail" component={PaymentFail} />
          <Route component={NotFound} />
        </Switch>
      </main>

      <MobileBottomNav />

      <footer className="hidden lg:block py-6 text-center text-muted-foreground text-sm border-t border-border bg-white">
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
