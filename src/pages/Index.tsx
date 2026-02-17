import { Button } from "@/components/ui/button";
import { Mail, ArrowRight, Shield, Zap, Smartphone, Users, Globe, Check, Sparkles, Star, Clock, Lock, Bell, Search, Archive, ChevronRight, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/theme-toggle";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    { icon: Mail, title: "Custom Addresses", description: "Create unlimited @afuchat.com emails for work, personal, or projects. Organize your life with separate inboxes.", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    { icon: Shield, title: "Secure by Default", description: "AES-256 encryption, spam filtering, and phishing protection built in from day one.", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
    { icon: Zap, title: "Instant Delivery", description: "Real-time push notifications on all devices. Never miss an important email again.", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    { icon: Smartphone, title: "Works Everywhere", description: "Progressive web app — install on iOS, Android, Mac, or Windows. One experience, every device.", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    { icon: Users, title: "Professional Aliases", description: "Create aliases that forward to your main inbox. Perfect for newsletters, signups, and privacy.", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400" },
    { icon: Globe, title: "Universal Compatibility", description: "Send and receive from Gmail, Outlook, Yahoo, and any standard email provider.", color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
  ];

  const advancedFeatures = [
    { icon: Search, title: "Powerful Search", description: "Find any email instantly by sender, subject, or content." },
    { icon: Archive, title: "Smart Threading", description: "Conversations grouped automatically for easy follow-ups." },
    { icon: Star, title: "Priority Inbox", description: "Important emails float to the top based on your habits." },
    { icon: Clock, title: "Scheduled Send", description: "Write now, deliver later — schedule emails for the perfect time." },
    { icon: Lock, title: "Zero Tracking", description: "No tracking pixels, no ad profiling, no data selling. Ever." },
    { icon: Bell, title: "Custom Alerts", description: "Choose exactly which emails trigger notifications." },
  ];

  const stats = [
    { value: "99.9%", label: "Uptime SLA" },
    { value: "<1s", label: "Delivery Speed" },
    { value: "0", label: "Ads Shown" },
    { value: "256-bit", label: "Encryption" },
  ];

  const testimonials = [
    { name: "Sarah K.", role: "Freelance Designer", text: "Finally an email service that respects my privacy without sacrificing features. The aliases are a game-changer." },
    { name: "Marcus T.", role: "Software Engineer", text: "Switched from Gmail and never looked back. The speed and clean UI make email actually enjoyable." },
    { name: "Priya R.", role: "Marketing Manager", text: "Scheduled send and push notifications keep me productive. Best email service I've used." },
  ];

  const faqs = [
    { q: "Is AfuChat Mail really free?", a: "Yes, completely free with no ads. We believe email is a basic utility that should be accessible to everyone." },
    { q: "Can I use my own domain?", a: "Currently we offer @afuchat.com addresses. Custom domain support is on our roadmap for Q3 2026." },
    { q: "How do you make money?", a: "We plan to offer premium features for power users in the future, but the core email experience will always be free." },
    { q: "Is my data safe?", a: "Absolutely. We use AES-256 encryption, never read your emails, and never sell your data. See our Security page for details." },
    { q: "Can I migrate from Gmail or Outlook?", a: "You can start receiving emails at your @afuchat.com address immediately. Import tools are coming soon." },
  ];

  return (
    <div className="min-h-screen bg-background overflow-y-auto scroll-smooth-ios">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <Mail className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-extrabold">AfuChat</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm">
            <button onClick={() => navigate("/features")} className="text-muted-foreground hover:text-foreground transition-colors font-semibold">Features</button>
            <button onClick={() => navigate("/security")} className="text-muted-foreground hover:text-foreground transition-colors font-semibold">Security</button>
            <button onClick={() => navigate("/developers")} className="text-muted-foreground hover:text-foreground transition-colors font-semibold">Developers</button>
            <button onClick={() => navigate("/about")} className="text-muted-foreground hover:text-foreground transition-colors font-semibold">About</button>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="rounded-xl font-semibold" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button size="sm" className="rounded-xl font-semibold shadow-sm hidden sm:flex" onClick={() => navigate("/auth")}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-20 pb-16">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-bold mb-6 shadow-xs border border-border">
            <Sparkles className="h-3.5 w-3.5" />
            Free forever · No ads · Privacy first
          </div>
          <h1 className="text-[2.5rem] md:text-6xl font-black tracking-tight mb-5 leading-[1.08]">
            Professional email,<br />
            <span className="text-primary">simplified.</span>
          </h1>
          <p className="text-[17px] md:text-xl text-muted-foreground mb-8 max-w-lg leading-relaxed font-medium">
            Create custom @afuchat.com addresses with unlimited aliases, smart threading, scheduled send, and real-time push notifications — all for free.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="rounded-xl shadow-md hover:shadow-lg transition-shadow h-12 px-6 font-bold" onClick={() => navigate("/auth")}>
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="rounded-xl h-12 px-6 font-bold border-border" onClick={() => navigate("/features")}>
              Explore Features
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-5xl mx-auto px-5 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 text-center shadow-xs">
              <p className="text-2xl md:text-3xl font-black text-primary mb-1">{stat.value}</p>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Core Features */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <div className="mb-10">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Core Features</p>
          <h2 className="text-3xl md:text-4xl font-black mb-3">Everything you need</h2>
          <p className="text-muted-foreground max-w-lg font-medium">Professional-grade email tools built for individuals and teams who value simplicity and privacy.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <div key={i} className="flex gap-4 items-start p-5 rounded-2xl bg-card border border-border shadow-xs hover:shadow-sm transition-shadow">
              <div className={`h-11 w-11 rounded-xl ${feature.color} flex items-center justify-center flex-shrink-0`}>
                <feature.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-[15px] mb-1">{feature.title}</h3>
                <p className="text-muted-foreground text-[13px] leading-relaxed font-medium">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Advanced Features */}
      <section className="bg-card border-y border-border">
        <div className="max-w-5xl mx-auto px-5 py-16">
          <div className="mb-10">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Advanced</p>
            <h2 className="text-3xl md:text-4xl font-black mb-3">Power tools, zero complexity</h2>
            <p className="text-muted-foreground max-w-lg font-medium">Features that make your workflow faster without adding clutter.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {advancedFeatures.map((feature, i) => (
              <div key={i} className="flex gap-3.5 items-start">
                <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                  <feature.icon className="h-4 w-4 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-[15px] mb-0.5">{feature.title}</h3>
                  <p className="text-muted-foreground text-[13px] leading-relaxed font-medium">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <div className="mb-10">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">How It Works</p>
          <h2 className="text-3xl md:text-4xl font-black mb-3">Up and running in 60 seconds</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { step: "01", title: "Create your account", desc: "Sign up with your existing email. No credit card, no hidden fees." },
            { step: "02", title: "Pick your address", desc: "Choose yourname@afuchat.com — it's instantly active and ready to use." },
            { step: "03", title: "Start communicating", desc: "Send and receive emails from any provider. Add aliases and customize notifications." },
          ].map((item, i) => (
            <div key={i} className="relative p-6 rounded-2xl bg-card border border-border shadow-xs">
              <span className="text-5xl font-black text-primary/10 absolute top-4 right-5">{item.step}</span>
              <div className="relative">
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed font-medium">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-card border-y border-border">
        <div className="max-w-5xl mx-auto px-5 py-16">
          <div className="mb-10">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Testimonials</p>
            <h2 className="text-3xl md:text-4xl font-black mb-3">Loved by users</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <div key={i} className="p-6 rounded-2xl bg-background border border-border shadow-xs">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 font-medium">"{t.text}"</p>
                <div>
                  <p className="font-bold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground font-medium">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-black mb-3">Common questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="p-5 rounded-2xl bg-card border border-border shadow-xs">
                <h3 className="font-bold text-[15px] mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <div className="bg-card border border-border rounded-3xl p-8 md:p-12 text-center shadow-md">
          <h2 className="text-3xl md:text-4xl font-black mb-3">Ready to switch?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto text-[15px] font-medium">
            Join thousands of users who chose privacy, speed, and simplicity. No credit card required.
          </p>
          <Button size="lg" className="rounded-xl shadow-md hover:shadow-lg h-12 px-8 font-bold" onClick={() => navigate("/auth")}>
            Create Free Account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <div className="flex flex-wrap items-center justify-center gap-5 mt-8 text-xs text-muted-foreground font-semibold">
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" /> Free forever</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" /> No ads or tracking</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" /> Privacy first</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" /> Setup in 60 seconds</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-5xl mx-auto px-5 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Product</p>
              <div className="space-y-2">
                <button onClick={() => navigate("/features")} className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Features</button>
                <button onClick={() => navigate("/security")} className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Security</button>
                <button onClick={() => navigate("/developers")} className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Developers</button>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Company</p>
              <div className="space-y-2">
                <button onClick={() => navigate("/about")} className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">About</button>
                <button onClick={() => navigate("/contact")} className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Contact</button>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Legal</p>
              <div className="space-y-2">
                <button onClick={() => navigate("/privacy")} className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Privacy Policy</button>
                <button onClick={() => navigate("/terms")} className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Terms of Service</button>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Support</p>
              <div className="space-y-2">
                <a href="mailto:support@afuchat.com" className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">support@afuchat.com</a>
                <a href="mailto:contact@afuchat.com" className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">contact@afuchat.com</a>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                <Mail className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold">AfuChat Mail</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">&copy; {new Date().getFullYear()} AfuChat Mail. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;