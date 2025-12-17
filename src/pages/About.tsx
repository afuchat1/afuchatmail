import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Target, Heart, Zap, Users, Globe, Award, ArrowRight } from "lucide-react";

const About = () => {
  const navigate = useNavigate();

  const values = [
    {
      icon: Target,
      title: "Focus",
      description: "Building the best email experience possible, without distractions"
    },
    {
      icon: Heart,
      title: "Privacy",
      description: "Your data belongs to you, always. No tracking, no ads, no compromises"
    },
    {
      icon: Zap,
      title: "Innovation",
      description: "Constantly improving and evolving to meet modern communication needs"
    }
  ];

  const stats = [
    { icon: Users, value: "10K+", label: "Active Users" },
    { icon: Globe, value: "50+", label: "Countries" },
    { icon: Award, value: "99.9%", label: "Uptime" }
  ];

  return (
    <PageLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="container mx-auto px-4 pt-16 pb-12 relative">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-4">About Us</Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="bg-gradient-primary bg-clip-text text-transparent">Building the Future</span>
              <br />
              <span className="text-foreground">of Email</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              We're on a mission to make professional email accessible to everyone
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5">
            <CardContent className="pt-8 pb-8 px-8">
              <Badge className="mb-4 bg-primary/10 text-primary">Our Mission</Badge>
              <h2 className="text-3xl font-bold mb-4">Email should be simple, secure, and free</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                AfuChat Mail was created to provide a simple, secure, and powerful email solution for modern professionals and teams. We believe email should be fast, private, and accessible to everyone without compromising on features or security. Our goal is simple: provide professional email addresses with enterprise-level features, while keeping it free and accessible to everyone.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Values */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">Our Values</Badge>
          <h2 className="text-3xl md:text-4xl font-bold">What We Stand For</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {values.map((value, index) => (
            <Card key={index} className="text-center border-2 hover:border-primary/50 transition-colors">
              <CardContent className="pt-8 pb-6">
                <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                  <value.icon className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="bg-muted/30 border-y">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <Badge variant="outline" className="mb-4">Our Story</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Why AfuChat Mail?</h2>
            <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
              <p>
                We started AfuChat Mail because we were frustrated with existing email services. They were either too complicated, invaded privacy with ads, or lacked essential features that modern professionals need.
              </p>
              <p>
                Our vision was clear: create an email service that respects users, offers enterprise-level features, and remains accessible to everyone. No hidden fees, no data mining, just pure email functionality built for the way people work today.
              </p>
              <p>
                Built with modern web technologies, AfuChat Mail delivers a fast, secure, and reliable email experience that works seamlessly across all your devices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of professionals who trust AfuChat Mail
          </p>
          <Button size="lg" onClick={() => navigate("/auth")}>
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </PageLayout>
  );
};

export default About;