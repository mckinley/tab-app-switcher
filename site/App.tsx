import { Toaster } from "@tab-app-switcher/ui/components/sonner"
import { TooltipProvider } from "@tab-app-switcher/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "next-themes"
import Index from "./pages/Index"
import Downloads from "./pages/Downloads"
import About from "./pages/About"
import Account from "./pages/Account"
import Collections from "./pages/Collections"
import Login from "./pages/Login"
import NotFound from "./pages/NotFound"

const queryClient = new QueryClient()

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/account" element={<Account />} />
            <Route path="/collections" element={<Collections />} />
            {/* Redirects to About page sections */}
            <Route path="/getting-started" element={<Navigate to="/about#getting-started" replace />} />
            <Route path="/pricing" element={<Navigate to="/about#pricing" replace />} />
            <Route path="/history" element={<Navigate to="/about#history" replace />} />
            <Route path="/compare" element={<Navigate to="/about#compare" replace />} />
            <Route path="/terms" element={<Navigate to="/about#terms" replace />} />
            <Route path="/support" element={<Navigate to="/about#support" replace />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
)

export default App
