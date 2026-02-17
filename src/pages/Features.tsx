import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Mail, Shield, Zap, Smartphone, Users, Globe, Search, Archive, Star, Clock, Lock, Bell, ArrowRight } from "lucide-react";

const Features = () => {
  const navigate = useNavigate();

  const features = [
    { icon: Mail, title: "Custom Email Addresses", description: "Create unlimited @afuchat.com addresses for work, personal, or projects." },
    { icon: Shield, title: "Enterprise Security", description: "Bank-level encryption and advanced spam protection." },
    { icon: Zap, title: "Lightning Fast", description: "Instant delivery with real-time notifications." },
    { icon: Smartphone, title: "Progressive Web App", description: "Install on any device with native experience and offline access." },
    { icon: Users, title: "Email Aliases", description: "Multiple aliases, one unified inbox." },
    { icon: Globe, title: "Universal Compatibility", description: "Works with Gmail, Outlook, Yahoo, and more." },
    { icon: Search, title: "Powerful Search", description: "Find any email instantly with advanced filters." },
    { icon: Archive, title: "Smart Organization", description: "Automatic threading and custom folders." },
    { icon: Star, title: "Important Markers", description: "Smart sorting based on sender history." },
    { icon: Clock, title: "Snooze", description: "Hide emails and have them reappear later." },
    { icon: Lock, title: "Privacy First", description: "No tracking, no ads, no data mining." },
    { icon: Bell, title: "Push Notifications", description: "Customizable real-time alerts." },
  ];

  return (
    <PageLayout>
      <section className="pt-12 pb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Features</h1>
        <p className="text-muted-foreground">Everything you need for professional email.</p>
      </section>

      <section className="pb-12">
        <div className="space-y-6">
          {features.map((feature, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <feature.icon className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h3 className="font-semibold mb-0.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-12 text-center border-t">
        <h2 className="text-xl font-bold mb-3">Ready to try?</h2>
        <Button size="lg" onClick={() => navigate("/auth")}>
          Get Started Free
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </section>
    </PageLayout>
  );
};

export default Features;
