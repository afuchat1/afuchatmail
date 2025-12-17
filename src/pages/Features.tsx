import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Mail, Shield, Zap, Smartphone, Users, Globe, Search, Archive, Star, Clock, Lock, Bell, ArrowRight, Check } from "lucide-react";

const Features = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Mail,
      title: "Custom Email Addresses",
      description: "Create unlimited @afuchat.com email addresses for different purposes - work, personal, or projects. Each address is fully functional and can send and receive emails.",
      highlight: true
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level encryption protects your emails. Advanced spam protection and security features keep your data safe from threats and unauthorized access."
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Instant email delivery with real-time notifications. Never miss important messages with our high-performance global infrastructure."
    },
    {
      icon: Smartphone,
      title: "Progressive Web App",
      description: "Install on any device for a native app experience. Works offline with push notifications and home screen installation."
    },
    {
      icon: Users,
      title: "Email Aliases",
      description: "Create multiple aliases for privacy or organization. All emails delivered to one unified inbox for easy management."
    },
    {
      icon: Globe,
      title: "Universal Compatibility",
      description: "Send and receive emails from any provider - Gmail, Outlook, Yahoo, and more. Full interoperability guaranteed."
    },
    {
      icon: Search,
      title: "Powerful Search",
      description: "Find any email instantly with our advanced search. Filter by sender, subject, date, attachments, or content."
    },
    {
      icon: Archive,
      title: "Smart Organization",
      description: "Automatic email threading keeps conversations together. Custom folders and labels help you stay organized."
    },
    {
      icon: Star,
      title: "Important Markers",
      description: "Flag important emails automatically based on sender history and content. Smart sorting helps you focus on what matters."
    },
    {
      icon: Clock,
      title: "Snooze Feature",
      description: "Temporarily hide emails and have them reappear at a specified time. Perfect for follow-ups, reminders, and task management."
    },
    {
      icon: Lock,
      title: "Privacy First",
      description: "No tracking, no ads, no data mining. Your emails and data belong to you, period. We never sell your information."
    },
    {
      icon: Bell,
      title: "Real-time Notifications",
      description: "Push notifications keep you informed instantly. Customize which emails trigger alerts and how you receive them."
    }
  ];

  const benefits = [
    "Unlimited email addresses",
    "No ads or tracking",
    "Works with all providers",
    "Real-time sync",
    "Offline access",
    "Mobile & desktop apps"
  ];

  return (
    <PageLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="container mx-auto px-4 pt-16 pb-12 relative">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="bg-gradient-primary bg-clip-text text-transparent">Powerful Features</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Everything you need for professional email communication, all in one place
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {benefits.map((benefit, index) => (
                <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
                  <Check className="h-3 w-3 mr-1" />
                  {benefit}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className={`group border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg ${feature.highlight ? 'md:col-span-2 lg:col-span-1 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent' : ''}`}
            >
              <CardContent className="pt-8 pb-6">
                <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to experience these features?</h2>
            <p className="text-muted-foreground mb-8">
              Get started for free and discover why thousands of professionals choose AfuChat Mail
            </p>
            <Button size="lg" onClick={() => navigate("/auth")}>
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Features;