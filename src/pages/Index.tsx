import { Button } from "@/components/ui/button";
import { Mail, ArrowRight, Shield, Zap, Smartphone, Users, Globe, Check, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/theme-toggle";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    { icon: Mail, title: "Custom Addresses", description: "Create @afuchat.com emails for work, personal, or projects", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    { icon: Shield, title: "Secure by Default", description: "Encrypted email with advanced spam protection", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
    { icon: Zap, title: "Instant Delivery", description: "Real-time notifications so you never miss a message", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    { icon: Smartphone, title: "Works Everywhere", description: "Install as an app on any device", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    { icon: Users, title: "Professional Aliases", description: "Multiple identities, one unified inbox", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400" },
    { icon: Globe, title: "Universal", description: "Compatible with Gmail, Outlook, Yahoo, and more", color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <Mail className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-extrabold">AfuChat</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="rounded-xl font-medium" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button size="sm" className="rounded-xl font-medium shadow-sm hidden sm:flex" onClick={() => navigate("/auth")}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-5 pt-16 pb-12">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold mb-6 shadow-xs border border-border">
          <Sparkles className="h-3.5 w-3.5" />
          Free forever · No ads · Privacy first
        </div>
        <h1 className="text-[2.5rem] md:text-6xl font-black tracking-tight mb-5 leading-[1.08]">
          Professional email,<br />
          <span className="text-primary">simplified.</span>
        </h1>
        <p className="text-[17px] md:text-lg text-muted-foreground mb-8 max-w-md leading-relaxed font-medium">
          Custom @afuchat.com addresses with aliases, threading, and real-time sync.
        </p>
        <div className="flex gap-3">
          <Button size="lg" className="rounded-xl shadow-md hover:shadow-lg transition-shadow h-12 px-6 font-semibold" onClick={() => navigate("/auth")}>
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" className="rounded-xl h-12 px-6 font-semibold border-border" onClick={() => navigate("/features")}>
            Learn More
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-3xl mx-auto px-5 py-12">
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature, i) => (
            <div key={i} className="flex gap-4 items-start p-4 rounded-2xl bg-card border border-border shadow-xs hover:shadow-sm transition-shadow">
              <div className={`h-10 w-10 rounded-xl ${feature.color} flex items-center justify-center flex-shrink-0`}>
                <feature.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-[15px] mb-0.5">{feature.title}</h3>
                <p className="text-muted-foreground text-[13px] leading-relaxed font-medium">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-5 py-16">
        <div className="bg-card border border-border rounded-3xl p-8 md:p-12 text-center shadow-md">
          <h2 className="text-3xl md:text-4xl font-black mb-3">Ready to start?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto text-[15px] font-medium">No credit card required. Setup in 60 seconds.</p>
          <Button size="lg" className="rounded-xl shadow-md hover:shadow-lg h-12 px-8 font-semibold" onClick={() => navigate("/auth")}>
            Create Free Account
          </Button>
          <div className="flex items-center justify-center gap-5 mt-8 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" /> Free forever</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" /> No ads</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" /> Privacy first</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-3xl mx-auto px-5 py-8">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mb-6">
            <button onClick={() => navigate("/features")} className="hover:text-foreground transition-colors font-medium">Features</button>
            <button onClick={() => navigate("/security")} className="hover:text-foreground transition-colors font-medium">Security</button>
            <button onClick={() => navigate("/about")} className="hover:text-foreground transition-colors font-medium">About</button>
            <button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors font-medium">Contact</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors font-medium">Privacy</button>
            <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors font-medium">Terms</button>
          </div>
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} AfuChat Mail. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
