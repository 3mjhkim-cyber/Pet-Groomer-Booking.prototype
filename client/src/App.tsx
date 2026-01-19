import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/Navbar";

// Pages
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Booking from "@/pages/Booking";
import Dashboard from "@/pages/Dashboard";
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
          <Route component={NotFound} />
        </Switch>
      </main>
      
      {/* Footer */}
      <footer className="py-8 text-center text-muted-foreground text-sm border-t border-border">
        <p>© 2024 안녕 강아지와 고양이. All rights reserved.</p>
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
