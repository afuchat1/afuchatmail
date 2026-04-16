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

      {/* DARK HERO */}
      <section className="bg-[#0a0a0a]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-20 pt-16 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:items-center md:pb-24 md:pt-20">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded border border-white/10 bg-white/5 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(217,100%,60%)]" />
              <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Professional Email Platform</span>
            </div>
            <h1 className="mb-5 max-w-xl text-4xl font-bold leading-[1.08] tracking-tight text-white md:text-5xl">
              Professional email for focused teams and <span className="text-[hsl(217,100%,60%)]">everyday work.</span>
            </h1>
            <p className="mb-8 max-w-lg text-base leading-relaxed text-white/55">
              AfuChat Mail gives you clean addresses, aliases, secure inboxes, smart threading, and fast notifications in a calm workspace that feels ready for business.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-11 rounded px-6 font-semibold bg-white text-[#0a0a0a] hover:bg-white/90 shadow-none" onClick={() => navigate("/auth")} data-testid="button-hero-start">
                Get started free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-11 rounded px-6 font-semibold border-white/20 text-white bg-transparent hover:bg-white/8" onClick={() => navigate("/features")} data-testid="button-hero-features">
                Explore features
              </Button>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-white/40">
              <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[hsl(217,100%,60%)]" /> Free forever</span>
              <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[hsl(217,100%,60%)]" /> No ads</span>
              <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[hsl(217,100%,60%)]" /> Supabase powered</span>
            </div>
          </div>

          <div className="rounded border border-white/10 bg-white/4 p-2">
            <div className="rounded border border-white/10 bg-[#111111]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Inbox</span>
              </div>
              <div className="grid md:grid-cols-[140px_1fr]">
                <aside className="hidden border-r border-white/8 p-3 md:block">
                  {["Inbox", "Important", "Sent", "Archive"].map((item, index) => (
                    <div key={item} className={`mb-1 rounded px-3 py-2 text-xs font-medium ${index === 0 ? "bg-white/10 text-white" : "text-white/40"}`}>
                      {item}
                    </div>
                  ))}
                </aside>
                <div className="p-3">
                  {[
                    ["AfuChat Team", "Your weekly delivery summary is ready", "2 min"],
                    ["Security", "New sign-in protection was enabled", "18 min"],
                    ["Support", "Re: custom alias setup", "1 hr"],
                  ].map(([sender, subject, time], index) => (
                    <div key={sender} className="mb-2 rounded border border-white/8 bg-white/4 p-3">
                      <div className="mb-0.5 flex items-center justify-between gap-3">
                        <p className="truncate text-xs font-semibold text-white" data-testid={`text-preview-sender-${index}`}>{sender}</p>
                        <span className="text-[10px] text-white/30">{time}</span>
                      </div>
                      <p className="truncate text-xs font-medium text-white/70">{subject}</p>
                      <p className="mt-0.5 truncate text-[10px] text-white/30">Clear, secure communication without visual noise.</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS — still on dark bg */}
      <section className="bg-[#0a0a0a] border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/8 border border-white/8 rounded overflow-hidden">
            {stats.map((stat, i) => (
              <div key={i} className="bg-[#0a0a0a] p-6">
                <p className="text-2xl md:text-3xl font-bold text-white mb-0.5" data-testid={`text-stat-${i}`}>{stat.value}</p>
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-10">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Core Features</p>
          <h2 className="text-3xl md:text-4xl font-black mb-3">Everything you need</h2>
          <p className="text-muted-foreground max-w-lg font-medium">Professional-grade email tools built for individuals and teams who value simplicity and privacy.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <div key={i} className="flex gap-4 items-start p-5 rounded border border-border bg-white">
              <div className="h-9 w-9 rounded border border-border bg-accent flex items-center justify-center flex-shrink-0">
                <feature.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                <p className="text-muted-foreground text-[13px] leading-relaxed">{feature.description}</p>
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
        <div className="grid gap-3 md:grid-cols-3">
          {platformHighlights.map((item, i) => (
            <div key={item.title} className="rounded border border-border bg-white p-6">
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded border border-border bg-accent">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-base font-semibold" data-testid={`text-platform-highlight-${i}`}>{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Advanced Features */}
      <section className="border-y border-border bg-secondary/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="mb-10">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Advanced</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Power tools, zero complexity</h2>
            <p className="text-muted-foreground max-w-lg text-sm">Features that make your workflow faster without adding clutter.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {advancedFeatures.map((feature, i) => (
              <div key={i} className="flex gap-3.5 items-start">
                <div className="h-8 w-8 rounded border border-border bg-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-0.5">{feature.title}</h3>
                  <p className="text-muted-foreground text-[13px] leading-relaxed">{feature.description}</p>
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
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { step: "01", title: "Create your account", desc: "Sign up with your existing email. No credit card, no hidden fees." },
            { step: "02", title: "Pick your address", desc: "Choose yourname@afuchat.com — it's instantly active and ready to use." },
            { step: "03", title: "Start communicating", desc: "Send and receive emails from any provider. Add aliases and customize notifications." },
          ].map((item, i) => (
            <div key={i} className="relative p-6 rounded border border-border bg-white">
              <span className="text-4xl font-bold text-border absolute top-4 right-5">{item.step}</span>
              <div className="relative">
                <h3 className="font-semibold text-base mb-1.5">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-border bg-secondary/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="mb-10">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Testimonials</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Loved by users</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <div key={i} className="p-6 rounded border border-border bg-white">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
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
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">FAQ</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Common questions</h2>
          </div>
          <div className="space-y-px border border-border rounded overflow-hidden">
            {faqs.map((faq, i) => (
              <div key={i} className="p-5 bg-white border-b border-border last:border-b-0">
                <h3 className="font-semibold text-sm mb-1.5">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — dark section */}
      <section className="bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-white">Ready to switch?</h2>
          <p className="text-white/50 mb-8 max-w-md mx-auto text-base">
            Join thousands of users who chose privacy, speed, and simplicity. No credit card required.
          </p>
          <Button size="lg" className="rounded shadow-none h-11 px-8 font-semibold bg-white text-[#0a0a0a] hover:bg-white/90" onClick={() => navigate("/auth")}>
            Create Free Account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-xs text-white/40 font-medium">
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[hsl(217,100%,60%)]" /> Free forever</span>
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[hsl(217,100%,60%)]" /> No ads or tracking</span>
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[hsl(217,100%,60%)]" /> Privacy first</span>
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[hsl(217,100%,60%)]" /> Setup in 60 seconds</span>
          </div>
        </div>
      </section>

      {/* Footer — dark */}
      <footer className="bg-[#0a0a0a] border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">Product</p>
              <div className="space-y-2">
                <button onClick={() => navigate("/features")} className="block text-sm text-white/50 hover:text-white transition-colors">Features</button>
                <button onClick={() => navigate("/solutions")} className="block text-sm text-white/50 hover:text-white transition-colors">Solutions</button>
                <button onClick={() => navigate("/pricing")} className="block text-sm text-white/50 hover:text-white transition-colors">Pricing</button>
                <button onClick={() => navigate("/security")} className="block text-sm text-white/50 hover:text-white transition-colors">Security</button>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">Developers</p>
              <div className="space-y-2">
                <button onClick={() => navigate("/docs")} className="block text-sm text-white/50 hover:text-white transition-colors">Documentation</button>
                <button onClick={() => navigate("/developers")} className="block text-sm text-white/50 hover:text-white transition-colors">Developer Console</button>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">Company</p>
              <div className="space-y-2">
                <button onClick={() => navigate("/about")} className="block text-sm text-white/50 hover:text-white transition-colors">About</button>
                <button onClick={() => navigate("/contact")} className="block text-sm text-white/50 hover:text-white transition-colors">Contact</button>
                <button onClick={() => navigate("/help")} className="block text-sm text-white/50 hover:text-white transition-colors">Help Center</button>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">Legal</p>
              <div className="space-y-2">
                <button onClick={() => navigate("/privacy")} className="block text-sm text-white/50 hover:text-white transition-colors">Privacy Policy</button>
                <button onClick={() => navigate("/terms")} className="block text-sm text-white/50 hover:text-white transition-colors">Terms of Service</button>
                <button onClick={() => navigate("/status")} className="block text-sm text-white/50 hover:text-white transition-colors">Status</button>
                <button onClick={() => navigate("/changelog")} className="block text-sm text-white/50 hover:text-white transition-colors">Changelog</button>
                <a href="mailto:support@afuchat.com" className="block text-sm text-white/50 hover:text-white transition-colors">Contact Support</a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="AfuChat Mail" className="h-6 w-6" width={24} height={24} />
              <span className="text-sm font-semibold text-white">AfuChat Mail</span>
            </div>
            <p className="text-xs text-white/30">&copy; {new Date().getFullYear()} AfuChat Mail. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;