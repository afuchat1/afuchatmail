import { Button } from "@/components/ui/button";
import { Mail, ArrowRight, Shield, Zap, Smartphone, Users, Globe, Check, Star, Clock, Lock, Bell, Search, Archive, MessageSquare, Briefcase, Code2, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";

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

  const platformHighlights = [
    { icon: Briefcase, title: "Professional workspace", description: "A flat, focused interface for client work, operations, newsletters, and personal business communication." },
    { icon: Code2, title: "Developer ready", description: "OAuth app management and scoped access give builders a clear foundation for future integrations." },
    { icon: Activity, title: "Trust pages included", description: "Pricing, status, changelog, help, privacy, terms, and security pages make the platform feel complete." },
  ];

  return (
    <div className="min-h-screen bg-background overflow-y-auto scroll-smooth-ios">
      <SiteHeader />

      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-14 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:items-center md:pb-20 md:pt-20">
        <div>
          <h1 className="mb-5 max-w-3xl text-[2.55rem] font-black leading-[1.04] tracking-tight md:text-6xl">
            Professional email for focused teams and everyday work.
          </h1>
          <p className="mb-8 max-w-xl text-base font-medium leading-8 text-muted-foreground md:text-xl">
            AfuChat Mail gives you clean addresses, aliases, secure inboxes, smart threading, and fast notifications in a calm workspace that feels ready for business.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-12 rounded-xl px-6 font-black shadow-none" onClick={() => navigate("/auth")} data-testid="button-hero-start">
              Get started free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 rounded-xl border-border px-6 font-black" onClick={() => navigate("/features")} data-testid="button-hero-features">
              Explore features
            </Button>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Free forever</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> No ads</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Supabase powered</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-2">
          <div className="rounded-xl border border-border bg-background">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Inbox</span>
            </div>
            <div className="grid md:grid-cols-[150px_1fr]">
              <aside className="hidden border-r border-border p-4 md:block">
                {["Inbox", "Important", "Sent", "Archive"].map((item, index) => (
                  <div key={item} className={`mb-2 rounded-xl px-3 py-2 text-sm font-bold ${index === 0 ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>
                    {item}
                  </div>
                ))}
              </aside>
              <div className="p-4">
                {[
                  ["AfuChat Team", "Your weekly delivery summary is ready", "2 min"],
                  ["Security", "New sign-in protection was enabled", "18 min"],
                  ["Support", "Re: custom alias setup", "1 hr"],
                ].map(([sender, subject, time], index) => (
                  <div key={sender} className="mb-3 rounded-xl border border-border bg-card p-4">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-black" data-testid={`text-preview-sender-${index}`}>{sender}</p>
                      <span className="text-xs font-bold text-muted-foreground">{time}</span>
                    </div>
                    <p className="truncate text-sm font-bold text-foreground">{subject}</p>
                    <p className="mt-1 truncate text-xs font-medium text-muted-foreground">Clear, secure communication without visual noise.</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5">
              <p className="text-2xl md:text-3xl font-black text-primary mb-1" data-testid={`text-stat-${i}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground font-black uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Core Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-10">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Core Features</p>
          <h2 className="text-3xl md:text-4xl font-black mb-3">Everything you need</h2>
          <p className="text-muted-foreground max-w-lg font-medium">Professional-grade email tools built for individuals and teams who value simplicity and privacy.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <div key={i} className="flex gap-4 items-start p-5 rounded-xl bg-card border border-border">
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

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-10">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Platform</p>
          <h2 className="text-3xl md:text-4xl font-black mb-3">More than a simple inbox</h2>
          <p className="text-muted-foreground max-w-2xl font-medium">AfuChat Mail now includes the public trust, support, and product pages expected from a professional email platform.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {platformHighlights.map((item, i) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-6">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-black" data-testid={`text-platform-highlight-${i}`}>{item.title}</h3>
              <p className="mt-2 text-sm font-medium leading-7 text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Advanced Features */}
      <section className="bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
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
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
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
            <div key={i} className="relative p-6 rounded-xl bg-card border border-border">
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="mb-10">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Testimonials</p>
            <h2 className="text-3xl md:text-4xl font-black mb-3">Loved by users</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <div key={i} className="p-6 rounded-xl bg-background border border-border">
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
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-black mb-3">Common questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="p-5 rounded-xl bg-card border border-border">
                <h3 className="font-bold text-[15px] mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-card border border-border rounded-xl p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-3">Ready to switch?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto text-[15px] font-medium">
            Join thousands of users who chose privacy, speed, and simplicity. No credit card required.
          </p>
          <Button size="lg" className="rounded-xl shadow-none h-12 px-8 font-bold" onClick={() => navigate("/auth")}>
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Product</p>
              <div className="space-y-2">
                <button onClick={() => navigate("/features")} className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Features</button>
                <button onClick={() => navigate("/solutions")} className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Solutions</button>
                <button onClick={() => navigate("/pricing")} className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Pricing</button>
                <button onClick={() => navigate("/security")} className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Security</button>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Developers</p>
              <div className="space-y-2">
                <button onClick={() => navigate("/docs")} className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Documentation</button>
                <button onClick={() => navigate("/developers")} className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Developer Console</button>
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
                <button onClick={() => navigate("/status")} className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Status</button>
                <button onClick={() => navigate("/changelog")} className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Changelog</button>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Support</p>
              <div className="space-y-2">
                <a href="mailto:support@afuchat.com" className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">support@afuchat.com</a>
                <a href="mailto:contact@afuchat.com" className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">contact@afuchat.com</a>
                <button onClick={() => navigate("/help")} className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Help Center</button>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="AfuChat Mail" className="h-7 w-7" width={28} height={28} />
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