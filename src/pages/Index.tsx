import { Button } from "@/components/ui/button";
import { Mail, ArrowRight, Shield, Zap, Smartphone, Users, Globe, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/theme-toggle";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    { icon: Mail, title: "Custom Addresses", description: "Create @afuchat.com emails for work, personal, or projects" },
    { icon: Shield, title: "Secure by Default", description: "Encrypted email with advanced spam protection" },
    { icon: Zap, title: "Instant Delivery", description: "Real-time notifications so you never miss a message" },
    { icon: Smartphone, title: "Works Everywhere", description: "Install as an app on any device" },
    { icon: Users, title: "Professional Aliases", description: "Multiple identities, one unified inbox" },
    { icon: Globe, title: "Universal", description: "Compatible with Gmail, Outlook, Yahoo, and more" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold">AfuChat Mail</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Sign In</Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-2xl mx-auto px-5 pt-16 pb-12">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          Professional email,<br />simplified.
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md">
          Custom @afuchat.com addresses with aliases, threading, and real-time sync. Free forever.
        </p>
        <div className="flex gap-3">
          <Button size="lg" onClick={() => navigate("/auth")}>
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="ghost" onClick={() => navigate("/features")}>
            Learn More
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-2xl mx-auto px-5 py-12">
        <div className="space-y-8">
          {features.map((feature, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <feature.icon className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h3 className="font-semibold mb-0.5">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-5 py-16 text-center">
        <h2 className="text-2xl font-bold mb-3">Ready to start?</h2>
        <p className="text-muted-foreground mb-6">No credit card required. Setup in 60 seconds.</p>
        <Button size="lg" onClick={() => navigate("/auth")}>
          Create Free Account
        </Button>
        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Free forever</span>
          <span className="flex items-center gap-1"><Check className="h-3 w-3" /> No ads</span>
          <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Privacy first</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-2xl mx-auto px-5 py-8">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mb-6">
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

export default Index;
