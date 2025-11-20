import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Mail, Shield, Zap, Smartphone, Users, Globe, Clock, Lock, Bell, Search, Archive, Star, ArrowLeft } from "lucide-react";

const Features = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Mail,
      title: "Custom Email Addresses",
      description: "Create unlimited @afuchat.com email addresses for different purposes - work, personal, or projects. Each address is fully functional and can send and receive emails."
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level encryption protects your emails. Advanced spam protection and security features keep your data safe from threats."
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Instant email delivery with real-time notifications. Never miss important messages with our high-performance infrastructure."
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
      description: "Find any email instantly with our advanced search. Filter by sender, subject, date, or content."
    },
    {
      icon: Archive,
      title: "Smart Organization",
      description: "Automatic email threading keeps conversations together. Custom folders and labels help you stay organized."
    },
    {
      icon: Star,
      title: "Important Markers",
      description: "Flag important emails automatically. Smart sorting helps you focus on what matters most."
    },
    {
      icon: Clock,
      title: "Snooze Feature",
      description: "Temporarily hide emails and have them reappear at a specified time. Perfect for follow-ups and reminders."
    },
    {
      icon: Lock,
      title: "Privacy First",
      description: "No tracking, no ads, no data mining. Your emails and data belong to you, period."
    },
    {
      icon: Bell,
      title: "Real-time Notifications",
      description: "Push notifications keep you informed instantly. Customize which emails trigger alerts."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="container mx-auto px-4 py-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Mail className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">AfuChat Mail</span>
            </div>
          </div>
          <Button onClick={() => navigate("/auth")}>
            Get Started
          </Button>
        </div>
      </header>

      <section className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Powerful Email Features
          </h1>
          <p className="text-xl text-muted-foreground">
            Everything you need for professional email communication, all in one place
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
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

        <div className="text-center mt-16">
          <Button size="lg" onClick={() => navigate("/auth")}>
            Get Started Free
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Features;
