import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Crown, Sparkles, Users, Shield, Zap, Globe } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SKYPAY_CHECKOUT_BASE = "https://fxdpbbscczpvmblyhnts.supabase.co/functions/v1/sdk/checkout";

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "For personal inboxes and lightweight professional use.",
    icon: Sparkles,
    features: [
      "1 primary @afuchat.com address",
      "Unlimited aliases",
      "Smart folders & threading",
      "Push notifications",
      "PWA access on all devices",
    ],
    cta: "Create account",
    href: "/auth",
    highlighted: false,
    skypayAmount: null,
  },
  {
    name: "Professional",
    price: "UGX 15,000",
    period: "/month",
    description: "For creators, freelancers, and small teams that need more control and capacity.",
    icon: Users,
    badge: "Popular",
    features: [
      "3 primary @afuchat.com addresses",
      "Unlimited aliases per address",
      "Custom domain support",
      "Advanced routing rules",
      "Priority email delivery",
      "5 GB attachment storage",
      "Priority support",
    ],
    cta: "Subscribe now",
    href: null,
    highlighted: true,
    skypayAmount: 15000,
    skypayDescription: "AfuChat Mail Professional — Monthly",
  },
  {
    name: "Business",
    price: "UGX 50,000",
    period: "/month",
    description: "For organizations that need security, compliance, team controls, and onboarding support.",
    icon: Shield,
    features: [
      "Unlimited @afuchat.com addresses",
      "Admin controls & audit logs",
      "Team shared aliases",
      "Security reviews & compliance",
      "Dedicated onboarding",
      "25 GB attachment storage",
      "SLA guarantee & priority support",
      "OAuth API access included",
    ],
    cta: "Subscribe now",
    href: null,
    highlighted: false,
    skypayAmount: 50000,
    skypayDescription: "AfuChat Mail Business — Monthly",
  },
];

const comparisons = [
  { feature: "Primary email addresses", starter: "1", pro: "3", business: "Unlimited" },
  { feature: "Aliases per address", starter: "Unlimited", pro: "Unlimited", business: "Unlimited" },
  { feature: "Attachment storage", starter: "500 MB", pro: "5 GB", business: "25 GB" },
  { feature: "Custom domain", starter: "—", pro: "Yes", business: "Yes" },
  { feature: "Push notifications", starter: "Yes", pro: "Yes", business: "Yes" },
  { feature: "Smart threading", starter: "Yes", pro: "Yes", business: "Yes" },
  { feature: "Routing rules", starter: "Basic", pro: "Advanced", business: "Advanced" },
  { feature: "Admin panel", starter: "—", pro: "—", business: "Yes" },
  { feature: "OAuth API access", starter: "—", pro: "—", business: "Yes" },
  { feature: "Support", starter: "Community", pro: "Priority", business: "Dedicated" },
];

const Pricing = () => {
  const navigate = useNavigate();

  const handleSubscribe = (plan: typeof plans[number]) => {
    if (plan.href) {
      navigate(plan.href);
      return;
    }
    if (plan.skypayAmount) {
      const params = new URLSearchParams({
        amount: plan.skypayAmount.toString(),
        description: plan.skypayDescription || plan.name,
        merchant: "AfuChat Mail",
        callback_url: `${window.location.origin}/dashboard`,
      });
      window.open(`${SKYPAY_CHECKOUT_BASE}?${params.toString()}`, "_blank");
    }
  };

  return (
    <PageLayout title="Pricing">
      {/* Hero */}
      <section className="pb-10">
        <h1 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
          Simple pricing, powered by <span className="text-primary">SkyPay</span>
        </h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Start free, upgrade when your workflow demands it. All payments processed securely via{" "}
          <a href="https://pay.afuchat.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            SkyPay
          </a>{" "}
          — Uganda's developer-grade payments platform with MTN MoMo support.
        </p>
      </section>

      {/* Plans */}
      <section className="grid gap-4 lg:grid-cols-3 mb-12">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`relative flex flex-col rounded-xl border p-6 ${
              plan.highlighted
                ? "border-primary bg-primary/[0.03]"
                : "border-border bg-background"
            }`}
          >
            {plan.badge && (
              <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-[11px] font-semibold px-2.5">
                {plan.badge}
              </Badge>
            )}

            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <plan.icon className="h-4.5 w-4.5" />
            </div>

            <h2 className="text-[18px] font-bold text-foreground">{plan.name}</h2>

            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-[28px] font-bold tracking-tight text-foreground">{plan.price}</span>
              {plan.period && <span className="text-[13px] text-muted-foreground">{plan.period}</span>}
            </div>

            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground min-h-[3rem]">
              {plan.description}
            </p>

            <ul className="mt-5 flex-1 space-y-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-[13px] text-foreground">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              className={`mt-6 h-10 rounded-lg text-[13px] font-semibold shadow-none ${
                plan.highlighted ? "" : ""
              }`}
              variant={plan.highlighted ? "default" : "outline"}
              onClick={() => handleSubscribe(plan)}
            >
              {plan.cta}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </article>
        ))}
      </section>

      {/* Comparison table */}
      <section className="mb-12">
        <h2 className="text-[20px] font-bold text-foreground mb-6">Compare plans</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground w-1/4">Feature</th>
                <th className="text-center py-2.5 px-4 font-semibold text-foreground">Starter</th>
                <th className="text-center py-2.5 px-4 font-semibold text-primary">Professional</th>
                <th className="text-center py-2.5 px-4 font-semibold text-foreground">Business</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {comparisons.map((row) => (
                <tr key={row.feature} className="border-b border-border">
                  <td className="py-2.5 pr-4 text-foreground font-medium">{row.feature}</td>
                  <td className="py-2.5 px-4 text-center">{row.starter}</td>
                  <td className="py-2.5 px-4 text-center">{row.pro}</td>
                  <td className="py-2.5 px-4 text-center">{row.business}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Payment info */}
      <section className="rounded-xl border border-border p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Zap className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-foreground mb-1">Payments via SkyPay</h3>
            <p className="text-[13px] leading-relaxed text-muted-foreground max-w-2xl">
              All subscriptions are processed through{" "}
              <a href="https://pay.afuchat.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                SkyPay
              </a>
              , supporting MTN MoMo Direct and SkyPay Wallet. Pay in UGX with no hidden fees.
              Subscriptions auto-renew monthly — cancel anytime from your dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* Fair pricing */}
      <section className="rounded-xl border border-border bg-accent/30 p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-2">Fair by design</p>
        <h2 className="text-[20px] font-bold text-foreground">The core mail experience stays free.</h2>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
          Paid plans add business controls, storage, and support. Your personal inbox, aliases, push notifications,
          and privacy-first experience remain available without ads or tracking — always.
        </p>
      </section>
    </PageLayout>
  );
};

export default Pricing;
