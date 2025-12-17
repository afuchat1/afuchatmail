import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Shield, Zap, ArrowRight, Users, Clock, Globe, Smartphone, Lock, Bell, Check, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/theme-toggle";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Mail,
      title: "Custom Email Addresses",
      description: "Create unlimited @afuchat.com email addresses for work, personal, or projects",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level encryption and advanced spam protection keeps your data safe",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Instant delivery with real-time notifications so you never miss a message",
    },
    {
      icon: Smartphone,
      title: "Progressive Web App",
      description: "Install on any device with native app experience and offline access",
    },
    {
      icon: Users,
      title: "Email Aliases",
      description: "Create aliases for privacy - all delivered to one unified inbox",
    },
    {
      icon: Globe,
      title: "Universal Compatibility",
      description: "Works with Gmail, Outlook, Yahoo, and all email providers",
    },
  ];

  const benefits = [
    {
      icon: Clock,
      title: "Save Time",
      description: "Smart threading, snooze, and powerful search help you manage emails 10x faster",
    },
    {
      icon: Lock,
      title: "Stay Private",
      description: "No tracking, no ads, no data mining. Your emails belong to you",
    },
    {
      icon: Bell,
      title: "Never Miss a Beat",
      description: "Real-time push notifications and importance markers keep you informed",
    },
  ];

  const steps = [
    { step: "01", title: "Sign Up Free", description: "Create your account in seconds - no credit card required" },
    { step: "02", title: "Choose Your Address", description: "Pick your @afuchat.com email and create aliases" },
    { step: "03", title: "Start Emailing", description: "Send and receive emails with full compatibility" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">AfuChat Mail</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <button onClick={() => navigate("/features")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</button>
              <button onClick={() => navigate("/security")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Security</button>
              <button onClick={() => navigate("/developers")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Developers</button>
              <button onClick={() => navigate("/about")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</button>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" onClick={() => navigate("/auth")}>Sign In</Button>
              <Button onClick={() => navigate("/auth")} className="hidden sm:flex">Get Started</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="container mx-auto px-4 pt-20 pb-32 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
              <Sparkles className="h-3 w-3 mr-1" />
              Professional Email Made Simple
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
              <span className="bg-gradient-primary bg-clip-text text-transparent">Email Reimagined</span>
              <br />
              <span className="text-foreground">for Modern Teams</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Create custom @afuchat.com email addresses with powerful features like threading, aliases, snooze, and real-time notifications. Works with all providers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 h-12 shadow-lg" onClick={() => navigate("/auth")}>
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 h-12" onClick={() => navigate("/features")}>
                View Features
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              No credit card required • Free forever • Setup in 60 seconds
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl md:text-4xl font-bold text-primary">10K+</p>
              <p className="text-sm text-muted-foreground mt-1">Active Users</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-primary">1M+</p>
              <p className="text-sm text-muted-foreground mt-1">Emails Sent</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-primary">99.9%</p>
              <p className="text-sm text-muted-foreground mt-1">Uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Features</Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Everything You Need</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional email management with all the features you expect and more
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card key={index} className="group border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <CardContent className="pt-8 pb-6">
                <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted/30 border-y">
        <div className="container mx-auto px-4 py-24">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Get Started in 3 Steps</h2>
            <p className="text-xl text-muted-foreground">Start sending professional emails in under a minute</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((item, index) => (
              <div key={index} className="relative text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-3xl font-bold text-primary-foreground mb-6 shadow-lg">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Why Choose Us</Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Built for Modern Professionals</h2>
          <p className="text-xl text-muted-foreground">Privacy-first email that works the way you do</p>
        </div>
        <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <benefit.icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-24">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 overflow-hidden relative">
          <CardContent className="text-center py-16 px-4 relative">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Transform Your Email?
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join thousands of professionals who trust AfuChat Mail for secure, fast, and reliable email communication
            </p>
            <Button size="lg" className="text-lg px-10 h-14 shadow-lg" onClick={() => navigate("/auth")}>
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Free forever</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> No credit card</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> 60 second setup</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Mail className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">AfuChat Mail</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Professional email service for modern teams and individuals.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate("/features")} className="hover:text-foreground transition-colors">Features</button></li>
                <li><button onClick={() => navigate("/security")} className="hover:text-foreground transition-colors">Security</button></li>
                <li><button onClick={() => navigate("/developers")} className="hover:text-foreground transition-colors">Developers</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate("/about")} className="hover:text-foreground transition-colors">About</button></li>
                <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">Contact</button></li>
                <li><button onClick={() => navigate("/install")} className="hover:text-foreground transition-colors">Install App</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">Privacy Policy</button></li>
                <li><button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Terms of Service</button></li>
              </ul>
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground pt-8 border-t">
            <p>&copy; {new Date().getFullYear()} AfuChat Mail. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;