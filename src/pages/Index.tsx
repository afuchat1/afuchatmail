import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Shield, Zap, ArrowRight, Check, Users, Clock, Globe, Smartphone, Lock, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Mail,
      title: "Custom Email Addresses",
      description: "Create unlimited @afuchat.com email addresses for different purposes - work, personal, or projects",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level encryption, spam protection, and advanced security features keep your data safe",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Instant email delivery and real-time notifications so you never miss important messages",
    },
    {
      icon: Smartphone,
      title: "Progressive Web App",
      description: "Install on any device and get native app experience with offline access and push notifications",
    },
    {
      icon: Users,
      title: "Email Aliases",
      description: "Create aliases for privacy or organization - all emails delivered to one unified inbox",
    },
    {
      icon: Globe,
      title: "Universal Compatibility",
      description: "Send and receive emails from any provider - Gmail, Outlook, Yahoo, and more",
    },
  ];

  const benefits = [
    {
      icon: Clock,
      title: "Save Time",
      description: "Smart threading, snooze features, and powerful search help you manage emails 10x faster",
    },
    {
      icon: Lock,
      title: "Stay Private",
      description: "No tracking, no ads, no data mining. Your emails belong to you, period",
    },
    {
      icon: Bell,
      title: "Never Miss a Beat",
      description: "Real-time push notifications and importance markers keep you informed on what matters",
    },
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Sign Up Free",
      description: "Create your account in seconds with just your email - no credit card required",
    },
    {
      step: "2",
      title: "Choose Your Address",
      description: "Pick your perfect @afuchat.com email address and create aliases as needed",
    },
    {
      step: "3",
      title: "Start Emailing",
      description: "Send and receive emails immediately with full compatibility across all providers",
    },
  ];

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      features: ["1 email address", "Basic support", "5GB storage"],
    },
    {
      name: "Pro",
      price: "$9",
      period: "per month",
      features: ["10 email addresses", "Priority support", "50GB storage", "Custom aliases"],
      popular: true,
    },
    {
      name: "Business",
      price: "$29",
      period: "per month",
      features: ["Unlimited emails", "24/7 support", "500GB storage", "Team management", "API access"],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">AfuChat Mail</span>
          </div>
          <Button variant="ghost" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-12 pb-20">
        <div className="text-center max-w-5xl mx-auto">
          <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20">
            Professional Email Made Simple
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000">
            Your Professional Email Service
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-4 animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-150">
            Create custom @afuchat.com email addresses with powerful features like threading, aliases, 
            snooze, and real-time notifications
          </p>
          <p className="text-lg text-muted-foreground mb-8 animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-200">
            Fully compatible with Gmail, Outlook, Yahoo, and all email providers
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
            <Button
              size="lg"
              className="text-lg px-8 shadow-lg"
              onClick={() => navigate("/auth")}
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8"
              onClick={() => navigate("/auth")}
            >
              Sign In
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • Free plan available forever
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 bg-card/50 rounded-3xl my-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Powerful Features
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need for professional email management in one beautiful interface
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-background"
            >
              <CardContent className="pt-8 pb-6">
                <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Get Started in 3 Simple Steps
          </h2>
          <p className="text-xl text-muted-foreground">
            Start sending professional emails in under a minute
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {howItWorks.map((step, index) => (
            <div key={index} className="text-center">
              <div className="bg-gradient-primary text-primary-foreground w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
                {step.step}
              </div>
              <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-20 bg-muted/50 rounded-3xl my-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Why Choose AfuChat Mail?
          </h2>
          <p className="text-xl text-muted-foreground">
            Built for modern professionals who value privacy and efficiency
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center">
              <div className="bg-primary/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <benefit.icon className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">{benefit.title}</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">{benefit.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-muted-foreground">
            Start free and upgrade as you grow - no hidden fees
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative border-2 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                plan.popular ? "border-primary shadow-xl md:scale-105" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold shadow-lg">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardContent className="pt-10 pb-8">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-8">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-2 text-lg">/ {plan.period}</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-base">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full text-base py-6"
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                  onClick={() => navigate("/auth")}
                >
                  {plan.popular ? "Start Free Trial" : "Get Started"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-center text-muted-foreground mt-12 text-lg">
          All plans include 7-day free trial • Cancel anytime • No hidden fees
        </p>
      </section>

      {/* Social Proof Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center">
          <p className="text-muted-foreground text-lg mb-8">
            Trusted by professionals worldwide
          </p>
          <div className="flex flex-wrap justify-center gap-8 items-center opacity-60">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              <span className="font-semibold">10,000+ Users</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-6 w-6" />
              <span className="font-semibold">1M+ Emails Sent</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6" />
              <span className="font-semibold">100% Secure</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="border-2 border-primary bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10 shadow-2xl">
          <CardContent className="text-center py-16 px-4">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Transform Your Email?
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Join thousands of professionals who trust AfuChat Mail for secure, 
              fast, and reliable email communication
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-10 py-6 shadow-lg" onClick={() => navigate("/auth")}>
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-10 py-6" onClick={() => navigate("/auth")}>
                View Demo
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              Free forever plan • No credit card required • Setup in 60 seconds
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 border-t">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">AfuChat Mail</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Professional email service for modern teams and individuals
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><button onClick={() => navigate("/auth")} className="hover:text-foreground transition-colors">Features</button></li>
              <li><button onClick={() => navigate("/auth")} className="hover:text-foreground transition-colors">Pricing</button></li>
              <li><button onClick={() => navigate("/auth")} className="hover:text-foreground transition-colors">Security</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><button onClick={() => navigate("/auth")} className="hover:text-foreground transition-colors">About</button></li>
              <li><button onClick={() => navigate("/auth")} className="hover:text-foreground transition-colors">Blog</button></li>
              <li><button onClick={() => navigate("/auth")} className="hover:text-foreground transition-colors">Contact</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><button onClick={() => navigate("/auth")} className="hover:text-foreground transition-colors">Privacy</button></li>
              <li><button onClick={() => navigate("/auth")} className="hover:text-foreground transition-colors">Terms</button></li>
              <li><button onClick={() => navigate("/auth")} className="hover:text-foreground transition-colors">Security</button></li>
            </ul>
          </div>
        </div>
        <div className="text-center text-sm text-muted-foreground pt-8 border-t">
          <p>&copy; 2024 AfuChat Mail. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;