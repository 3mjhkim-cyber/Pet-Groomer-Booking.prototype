import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/Navbar";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Booking from "@/pages/Booking";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import Calendar from "@/pages/Calendar";
import Deposit from "@/pages/Deposit";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/login" component={Login} />
          <Route path="/book/gangnam" component={Booking} />
          <Route path="/admin/dashboard" component={Dashboard} />
          <Route path="/admin/customers" component={Customers} />
          <Route path="/admin/calendar" component={Calendar} />
          <Route path="/deposit/:id" component={Deposit} />
          <Route component={NotFound} />
        </Switch>
      </main>
      
      <footer className="py-6 text-center text-muted-foreground text-sm border-t border-border bg-white">
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
