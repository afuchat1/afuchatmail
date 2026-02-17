import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Heart, Shield, Lightbulb, Users, Globe, Rocket } from "lucide-react";

const About = () => {
  const navigate = useNavigate();

  const values = [
    { icon: Heart, title: "User First", description: "Every decision starts with what's best for our users. No dark patterns, no manipulation — just tools that work." },
    { icon: Shield, title: "Privacy by Design", description: "Your data belongs to you. We don't read your emails, sell your data, or serve targeted ads. Full stop." },
    { icon: Lightbulb, title: "Simplicity", description: "Email doesn't need to be complicated. We strip away the noise and focus on what matters: communication." },
    { icon: Rocket, title: "Innovation", description: "We're constantly building new features — scheduled send, swipe actions, smart threading — that make email faster." },
    { icon: Users, title: "Community", description: "Built by people who use email every day. Your feedback directly shapes the product roadmap." },
    { icon: Globe, title: "Accessibility", description: "Professional email should be free and available to everyone, everywhere, on every device." },
  ];

  const timeline = [
    { year: "2025", title: "The Beginning", description: "AfuChat Mail was born from frustration with bloated, ad-filled email services that prioritize profit over users." },
    { year: "2025", title: "First Users", description: "Beta launch with core features: custom addresses, aliases, push notifications, and a clean mobile-first UI." },
    { year: "2026", title: "Full Launch", description: "Public release with scheduled send, swipe actions, templates, OAuth API, and the developer portal." },
    { year: "2026+", title: "What's Next", description: "Custom domains, end-to-end encryption, calendar integration, and a desktop app. The roadmap is driven by you." },
  ];

  const team = [
    { name: "Engineering", description: "Building a fast, reliable, and secure platform that scales to millions of users." },
    { name: "Design", description: "Crafting a clean, intuitive experience that makes email feel effortless." },
    { name: "Security", description: "Ensuring your data is protected with enterprise-grade encryption and monitoring." },
  ];

  return (
    <PageLayout title="About">
      {/* Hero */}
      <section className="pb-10">
        <h1 className="text-3xl font-black tracking-tight mb-3">About AfuChat Mail</h1>
        <p className="text-lg text-muted-foreground font-medium leading-relaxed">
          We're building the email service we always wanted — fast, private, and genuinely free.
        </p>
      </section>

      {/* Story */}
      <section className="pb-10 space-y-4 text-muted-foreground leading-relaxed">
        <p>
          AfuChat Mail started because we were tired of email services that read our messages to sell ads, buried simple features behind paywalls, and treated privacy as an afterthought.
        </p>
        <p>
          We believe email is essential infrastructure — like water or electricity. It should be reliable, private, and accessible to everyone. That's why AfuChat Mail is free, ad-free, and always will be.
        </p>
        <p>
          Our team is small but focused. We ship fast, listen to our users, and never compromise on privacy. Every feature we build is designed to make email simpler, not more complicated.
        </p>
      </section>

      {/* Values */}
      <section className="py-10 border-t border-border">
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Our Values</p>
        <h2 className="text-2xl font-black mb-6">What we stand for</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {values.map((value, i) => (
            <div key={i} className="flex gap-3.5 items-start">
              <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                <value.icon className="h-4 w-4 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-[15px] mb-0.5">{value.title}</h3>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">{value.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="py-10 border-t border-border">
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Our Journey</p>
        <h2 className="text-2xl font-black mb-6">How we got here</h2>
        <div className="space-y-6">
          {timeline.map((item, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {item.year.slice(2)}
                </div>
                {i < timeline.length - 1 && <div className="w-px flex-1 bg-border mt-2" />}
              </div>
              <div className="pb-6">
                <p className="text-xs text-muted-foreground font-semibold mb-1">{item.year}</p>
                <h3 className="font-bold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="py-10 border-t border-border">
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Our Teams</p>
        <h2 className="text-2xl font-black mb-6">Built by passionate people</h2>
        <div className="space-y-4">
          {team.map((t, i) => (
            <div key={i} className="p-5 rounded-2xl bg-card border border-border shadow-xs">
              <h3 className="font-bold mb-1">{t.name}</h3>
              <p className="text-sm text-muted-foreground font-medium">{t.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="py-10 border-t border-border">
        <div className="p-6 rounded-2xl bg-accent/50 border border-border">
          <h2 className="text-xl font-black mb-3">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed font-medium">
            To make professional, private email accessible to every person on the planet — free from ads, tracking, and paywalls. We're committed to building open, transparent tools that put users in control of their digital communication.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 text-center border-t border-border">
        <h2 className="text-2xl font-black mb-3">Join thousands of happy users</h2>
        <p className="text-muted-foreground mb-6 font-medium">Get your free @afuchat.com email today.</p>
        <Button size="lg" className="rounded-xl shadow-md font-bold" onClick={() => navigate("/auth")}>
          Get Started Free
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </section>

      <div className="pb-16" />
    </PageLayout>
  );
};

export default About;