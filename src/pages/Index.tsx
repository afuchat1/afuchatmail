import { Button } from "@/components/ui/button";
import { Mail, ArrowRight, Shield, Zap, Smartphone, Users, Globe, Check, Star, Clock, Lock, Bell, Search, Archive, MessageSquare, Briefcase, Code2, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";

const LogoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#0052ff"/>
    <rect x="9" y="14" width="22" height="14" rx="1.5" stroke="white" strokeWidth="1.5" fill="none"/>
    <path d="M9 14l11 9 11-9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Index = () => {
  const navigate = useNavigate();

  const features = [
    { icon: Mail, title: "Custom Addresses", description: "Create unlimited @afuchat.com emails for work, personal, or projects. Organize your life with separate inboxes." },
    { icon: Shield, title: "Secure by Default", description: "AES-256 encryption, spam filtering, and phishing protection built in from day one." },
    { icon: Zap, title: "Instant Delivery", description: "Real-time push notifications on all devices. Never miss an important email again." },
    { icon: Smartphone, title: "Works Everywhere", description: "Progressive web app — install on iOS, Android, Mac, or Windows. One experience, every device." },
    { icon: Users, title: "Professional Aliases", description: "Create aliases that forward to your main inbox. Perfect for newsletters, signups, and privacy." },
    { icon: Globe, title: "Universal Compatibility", description: "Send and receive from Gmail, Outlook, Yahoo, and any standard email provider." },
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
    <div className="min-h-screen bg-white overflow-y-auto">
      <SiteHeader />

      {/* DARK HERO */}
      <section className="bg-[#0a0a0a]">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-24 pt-20 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:items-center md:pt-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 bg-white/8 rounded-full px-3.5 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0052ff]" />
              <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Professional Email Platform</span>
            </div>
            <h1 className="mb-5 max-w-xl text-5xl font-bold leading-[1.05] tracking-tight text-white md:text-6xl">
              Email built for<br /><span className="text-[#0052ff]">focused teams.</span>
            </h1>
            <p className="mb-8 max-w-lg text-base leading-relaxed text-white/50">
              Clean addresses, smart aliases, secure inboxes, and instant notifications — in a calm workspace that feels ready for business from day one.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-12 rounded px-7 text-sm font-semibold bg-white text-[#0a0a0a] hover:bg-white/90 shadow-none" onClick={() => navigate("/auth")} data-testid="button-hero-start">
                Get started free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 rounded px-7 text-sm font-semibold border-white/15 text-white bg-transparent hover:bg-white/8" onClick={() => navigate("/features")} data-testid="button-hero-features">
                See features
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-white/35">
              <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[#0052ff]" /> Free forever</span>
              <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[#0052ff]" /> No ads or tracking</span>
              <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[#0052ff]" /> Setup in 60 seconds</span>
            </div>
          </div>

          {/* Inbox preview */}
          <div className="rounded-xl overflow-hidden bg-[#111111]">
            <div className="flex items-center justify-between px-4 py-3 bg-[#161616]">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Inbox</span>
              <div className="w-12" />
            </div>
            <div className="grid md:grid-cols-[130px_1fr]">
              <aside className="hidden bg-[#111111] p-3 md:block">
                {["Inbox", "Important", "Sent", "Archive"].map((item, index) => (
                  <div key={item} className={`mb-1 rounded px-3 py-2 text-xs font-medium ${index === 0 ? "bg-[#0052ff]/20 text-[#4d8bff]" : "text-white/35 hover:text-white/60"}`}>
                    {item}
                  </div>
                ))}
              </aside>
              <div className="p-3 space-y-2">
                {[
                  ["AfuChat Team", "Your weekly delivery summary is ready", "2 min", true],
                  ["Security", "New sign-in protection was enabled", "18 min", false],
                  ["Support", "Re: custom alias setup", "1 hr", false],
                ].map(([sender, subject, time, unread], index) => (
                  <div key={String(sender)} className={`rounded-lg p-3 ${unread ? "bg-[#0052ff]/10" : "bg-white/4"}`}>
                    <div className="mb-0.5 flex items-center justify-between gap-3">
                      <p className={`truncate text-xs font-semibold ${unread ? "text-white" : "text-white/70"}`} data-testid={`text-preview-sender-${index}`}>{String(sender)}</p>
                      <span className="text-[10px] text-white/25 shrink-0">{String(time)}</span>
                    </div>
                    <p className="truncate text-xs text-white/55">{String(subject)}</p>
                    <p className="mt-0.5 truncate text-[10px] text-white/25">Secure, clean communication.</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS — dark */}
      <section className="bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 overflow-hidden rounded-xl">
            {stats.map((stat, i) => (
              <div key={i} className="bg-[#0a0a0a] p-7">
                <p className="text-3xl font-bold text-white mb-1" data-testid={`text-stat-${i}`}>{stat.value}</p>
                <p className="text-xs text-white/35 font-medium uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="bg-neutral-50 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-6">Trusted by individuals and teams worldwide</p>
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
            {["Founders", "Freelancers", "Startups", "Remote teams", "Developers", "Agencies"].map((type) => (
              <span key={type} className="text-sm font-medium text-neutral-400">{type}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="mb-12">
          <p className="text-xs font-bold text-[#0052ff] uppercase tracking-wider mb-3">Core Features</p>
          <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">Everything you need</h2>
          <p className="text-neutral-500 max-w-lg text-base leading-relaxed">Professional-grade email tools built for individuals and teams who value simplicity and privacy.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <div key={i} className="flex gap-4 items-start p-6 rounded-xl bg-neutral-50">
              <div className="h-9 w-9 rounded-lg bg-[#0052ff]/10 flex items-center justify-center flex-shrink-0">
                <feature.icon className="h-4 w-4 text-[#0052ff]" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1.5 text-neutral-900">{feature.title}</h3>
                <p className="text-neutral-500 text-[13px] leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Platform highlights */}
      <section className="bg-neutral-50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="mb-12">
            <p className="text-xs font-bold text-[#0052ff] uppercase tracking-wider mb-3">Platform</p>
            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">More than a simple inbox</h2>
            <p className="text-neutral-500 max-w-2xl text-base leading-relaxed">AfuChat Mail includes all the trust, support, and product pages expected from a professional email platform.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {platformHighlights.map((item, i) => (
              <div key={item.title} className="rounded-xl bg-white p-7">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-[#0052ff]/10">
                  <item.icon className="h-5 w-5 text-[#0052ff]" />
                </div>
                <h3 className="text-base font-semibold mb-2 text-neutral-900" data-testid={`text-platform-highlight-${i}`}>{item.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-500">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="mb-12">
          <p className="text-xs font-semibold text-[#0052ff] uppercase tracking-widest mb-3">Advanced</p>
          <h2 className="text-4xl font-black mb-4 tracking-tight">Power tools, zero complexity</h2>
          <p className="text-neutral-500 max-w-lg text-base leading-relaxed">Features that make your workflow faster without adding clutter.</p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {advancedFeatures.map((feature, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <feature.icon className="h-4 w-4 text-neutral-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1 text-neutral-900">{feature.title}</h3>
                <p className="text-neutral-500 text-[13px] leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-neutral-50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="mb-12">
            <p className="text-xs font-bold text-[#0052ff] uppercase tracking-wider mb-3">How It Works</p>
            <h2 className="text-4xl font-black mb-4 tracking-tight">Up and running in 60 seconds</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { step: "1", title: "Create your account", desc: "Sign up with your existing email. No credit card, no hidden fees." },
              { step: "2", title: "Pick your address", desc: "Choose yourname@afuchat.com — it's instantly active and ready to use." },
              { step: "3", title: "Start communicating", desc: "Send and receive emails from any provider. Add aliases and customize notifications." },
            ].map((item, i) => (
              <div key={i} className="rounded-xl bg-white p-7">
                <div className="h-10 w-10 rounded-lg bg-[#0052ff] flex items-center justify-center mb-5">
                  <span className="text-sm font-bold text-white">{item.step}</span>
                </div>
                <h3 className="font-semibold text-base mb-2 text-neutral-900">{item.title}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="mb-12">
          <p className="text-xs font-semibold text-[#0052ff] uppercase tracking-widest mb-3">Testimonials</p>
          <h2 className="text-4xl font-black mb-2 tracking-tight">Loved by users</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <div key={i} className="p-7 rounded-xl bg-neutral-50">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-neutral-500 leading-relaxed mb-5">"{t.text}"</p>
              <div>
                <p className="font-semibold text-sm text-neutral-900">{t.name}</p>
                <p className="text-xs text-neutral-400">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-neutral-50 py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold text-[#0052ff] uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-4xl font-black tracking-tight">Common questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="p-6 rounded-xl bg-white">
                <h3 className="font-semibold text-sm mb-2 text-neutral-900">{faq.q}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white tracking-tight">Ready to switch?</h2>
          <p className="text-white/45 mb-10 max-w-md mx-auto text-base leading-relaxed">
            Join thousands of users who chose privacy, speed, and simplicity. No credit card required.
          </p>
          <Button size="lg" className="rounded shadow-none h-12 px-9 text-sm font-semibold bg-white text-[#0a0a0a] hover:bg-white/90" onClick={() => navigate("/auth")}>
            Create Free Account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <div className="flex flex-wrap items-center justify-center gap-7 mt-10 text-xs text-white/30 font-medium">
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[#0052ff]" /> Free forever</span>
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[#0052ff]" /> No ads or tracking</span>
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[#0052ff]" /> Privacy first</span>
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[#0052ff]" /> Setup in 60 seconds</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div>
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-4">Product</p>
              <div className="space-y-2.5">
                {[["Features", "/features"], ["Solutions", "/solutions"], ["Pricing", "/pricing"], ["Security", "/security"]].map(([label, path]) => (
                  <button key={path} onClick={() => navigate(path)} className="block text-sm text-white/45 hover:text-white transition-colors">{label}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-4">Developers</p>
              <div className="space-y-2.5">
                {[["Documentation", "/docs"], ["Developer Console", "/developers"]].map(([label, path]) => (
                  <button key={path} onClick={() => navigate(path)} className="block text-sm text-white/45 hover:text-white transition-colors">{label}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-4">Company</p>
              <div className="space-y-2.5">
                {[["About", "/about"], ["Contact", "/contact"], ["Help Center", "/help"]].map(([label, path]) => (
                  <button key={path} onClick={() => navigate(path)} className="block text-sm text-white/45 hover:text-white transition-colors">{label}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-4">Legal</p>
              <div className="space-y-2.5">
                {[["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"], ["Status", "/status"], ["Changelog", "/changelog"]].map(([label, path]) => (
                  <button key={path} onClick={() => navigate(path)} className="block text-sm text-white/45 hover:text-white transition-colors">{label}</button>
                ))}
                <a href="mailto:support@afuchat.com" className="block text-sm text-white/45 hover:text-white transition-colors">Support</a>
              </div>
            </div>
          </div>
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4" style={{borderTop: '1px solid rgba(255,255,255,0.06)'}}>
            <div className="flex items-center gap-2.5">
              <svg width="22" height="22" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" rx="8" fill="#0052ff"/>
                <rect x="9" y="14" width="22" height="14" rx="1.5" stroke="white" strokeWidth="1.5" fill="none"/>
                <path d="M9 14l11 9 11-9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-sm font-semibold text-white">AfuChat Mail</span>
            </div>
            <p className="text-xs text-white/25">&copy; {new Date().getFullYear()} AfuChat Mail. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
