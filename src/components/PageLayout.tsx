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
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showBackButton && (
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold hidden sm:inline">AfuChat Mail</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button onClick={() => navigate("/auth")}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Mail className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">AfuChat Mail</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Professional email service for modern teams and individuals.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate("/features")} className="hover:text-foreground transition-colors">Features</button></li>
                <li><button onClick={() => navigate("/security")} className="hover:text-foreground transition-colors">Security</button></li>
                <li><button onClick={() => navigate("/developers")} className="hover:text-foreground transition-colors">Developers</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate("/about")} className="hover:text-foreground transition-colors">About</button></li>
                <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">Contact</button></li>
                <li><button onClick={() => navigate("/install")} className="hover:text-foreground transition-colors">Install App</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">Privacy Policy</button></li>
                <li><button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Terms of Service</button></li>
              </ul>
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground pt-8 border-t">
            <p>&copy; {new Date().getFullYear()} AfuChat Mail. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};