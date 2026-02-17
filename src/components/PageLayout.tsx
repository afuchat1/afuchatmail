import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

interface PageLayoutProps {
  children: ReactNode;
  showBackButton?: boolean;
  title?: string;
}

export const PageLayout = ({ children, showBackButton = true, title }: PageLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {showBackButton && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <button onClick={() => navigate("/")} className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold hidden sm:inline">AfuChat Mail</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button size="sm" onClick={() => navigate("/auth")}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5">{children}</main>

      <footer className="border-t mt-16">
        <div className="max-w-2xl mx-auto px-5 py-8">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mb-4">
            <button onClick={() => navigate("/features")} className="hover:text-foreground">Features</button>
            <button onClick={() => navigate("/security")} className="hover:text-foreground">Security</button>
            <button onClick={() => navigate("/about")} className="hover:text-foreground">About</button>
            <button onClick={() => navigate("/contact")} className="hover:text-foreground">Contact</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-foreground">Privacy</button>
            <button onClick={() => navigate("/terms")} className="hover:text-foreground">Terms</button>
          </div>
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} AfuChat Mail</p>
        </div>
      </footer>
    </div>
  );
};
