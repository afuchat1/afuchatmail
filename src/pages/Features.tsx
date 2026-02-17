import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Mail, Shield, Zap, Smartphone, Users, Globe, Search, Archive, Star, Clock, Lock, Bell, ArrowRight, Palette, PenSquare, Layers, Code, RefreshCw } from "lucide-react";

const Features = () => {
  const navigate = useNavigate();

  const coreFeatures = [
    { icon: Mail, title: "Custom Email Addresses", description: "Create unlimited @afuchat.com addresses for work, personal, newsletters, or side projects. Each address has its own inbox." },
    { icon: Users, title: "Smart Aliases", description: "Create aliases that forward to your main inbox. Perfect for signups, privacy, and organizing incoming mail without extra accounts." },
    { icon: Shield, title: "Enterprise Security", description: "AES-256 encryption at rest, TLS 1.3 in transit, bcrypt password hashing, and multi-layer spam protection built in from day one." },
    { icon: Zap, title: "Instant Delivery", description: "Emails arrive in real-time with push notifications on all devices. No polling delays, no missed messages." },
    { icon: Smartphone, title: "Progressive Web App", description: "Install AfuChat Mail as a native app on iOS, Android, Mac, or Windows. Full offline access and background sync." },
    { icon: Globe, title: "Universal Compatibility", description: "Send and receive emails from Gmail, Outlook, Yahoo, ProtonMail, and any standard email provider." },
  ];

  const productivityFeatures = [
    { icon: Clock, title: "Scheduled Send", description: "Write now, deliver later. Schedule emails for the perfect time with preset options or a custom datetime picker." },
    { icon: Search, title: "Powerful Search", description: "Find any email instantly by searching sender, subject, or content. Results appear in real-time as you type." },
    { icon: Archive, title: "Smart Threading", description: "Conversations are automatically grouped into threads. Follow discussions naturally without hunting through your inbox." },
    { icon: Star, title: "Priority & Starring", description: "Star important emails and mark messages as important. Keep your critical communications at the top." },
    { icon: PenSquare, title: "Email Templates", description: "Save frequently used email formats as templates. Apply them with one click when composing new messages." },
    { icon: Palette, title: "Signatures", description: "Create professional email signatures per address. Automatically appended to every email you send." },
  ];

  const advancedFeatures = [
    { icon: Bell, title: "Push Notifications", description: "Customizable real-time alerts. Choose which emails trigger notifications and silence the rest." },
    { icon: Layers, title: "Custom Folders", description: "Organize your inbox with custom folders. Move, archive, and categorize emails the way you work." },
    { icon: Lock, title: "Privacy First", description: "No tracking pixels, no ad profiling, no data selling. Your email content is never read or analyzed." },
    { icon: RefreshCw, title: "Swipe Actions", description: "On mobile, swipe emails left to delete or right to archive. Fast, intuitive inbox management." },
    { icon: Code, title: "Developer API", description: "Full OAuth 2.0 API for building integrations. Read emails, send messages, and manage folders programmatically." },
  ];

  const comparison = [
    { feature: "Custom addresses", afuchat: true, gmail: false, outlook: false },
    { feature: "Unlimited aliases", afuchat: true, gmail: false, outlook: false },
    { feature: "No ads", afuchat: true, gmail: false, outlook: true },
    { feature: "No tracking", afuchat: true, gmail: false, outlook: false },
    { feature: "Scheduled send", afuchat: true, gmail: true, outlook: true },
    { feature: "Push notifications", afuchat: true, gmail: true, outlook: true },
    { feature: "PWA support", afuchat: true, gmail: false, outlook: false },
    { feature: "Open API", afuchat: true, gmail: true, outlook: true },
    { feature: "Free forever", afuchat: true, gmail: true, outlook: false },
  ];

  return (
    <PageLayout title="Features">
      <section className="pb-8">
        <h1 className="text-3xl font-black tracking-tight mb-3">Features</h1>
        <p className="text-lg text-muted-foreground font-medium leading-relaxed">
          Everything you need for professional email — and nothing you don't.
        </p>
      </section>

      {/* Core Features */}
      <section className="pb-10">
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Core</p>
        <h2 className="text-2xl font-black mb-6">The essentials, done right</h2>
        <div className="space-y-4">
          {coreFeatures.map((feature, i) => (
            <div key={i} className="flex gap-4 items-start p-4 rounded-2xl bg-card border border-border shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                <feature.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-bold mb-0.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Productivity Features */}
      <section className="py-10 border-t border-border">
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Productivity</p>
        <h2 className="text-2xl font-black mb-6">Work smarter, not harder</h2>
        <div className="space-y-4">
          {productivityFeatures.map((feature, i) => (
            <div key={i} className="flex gap-4 items-start p-4 rounded-2xl bg-card border border-border shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                <feature.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-bold mb-0.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-10 border-t border-border">
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Advanced</p>
        <h2 className="text-2xl font-black mb-6">Power user tools</h2>
        <div className="space-y-4">
          {advancedFeatures.map((feature, i) => (
            <div key={i} className="flex gap-4 items-start p-4 rounded-2xl bg-card border border-border shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                <feature.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-bold mb-0.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="py-10 border-t border-border">
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Comparison</p>
        <h2 className="text-2xl font-black mb-6">How we compare</h2>
        <div className="rounded-2xl border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Feature</th>
                  <th className="text-center px-4 py-3 font-bold text-xs uppercase tracking-wider text-primary">AfuChat</th>
                  <th className="text-center px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Gmail</th>
                  <th className="text-center px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Outlook</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{row.feature}</td>
                    <td className="text-center px-4 py-3">{row.afuchat ? <span className="text-green-500 font-bold">✓</span> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="text-center px-4 py-3">{row.gmail ? <span className="text-green-500 font-bold">✓</span> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="text-center px-4 py-3">{row.outlook ? <span className="text-green-500 font-bold">✓</span> : <span className="text-muted-foreground">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 text-center border-t border-border">
        <h2 className="text-2xl font-black mb-3">Ready to try?</h2>
        <p className="text-muted-foreground mb-6 font-medium">All features included. No paywalls. No credit card.</p>
        <Button size="lg" className="rounded-xl shadow-md font-bold" onClick={() => navigate("/auth")}>
          Get Started Free
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </section>

      <div className="pb-16" />
    </PageLayout>
  );
};

export default Features;