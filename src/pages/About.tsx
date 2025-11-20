import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Mail, Target, Heart, Zap, ArrowLeft } from "lucide-react";

const About = () => {
  const navigate = useNavigate();

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
            About AfuChat Mail
          </h1>
          <p className="text-xl text-muted-foreground">
            Building the future of email communication
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-12">
          <Card className="border-2">
            <CardContent className="pt-8 pb-6">
              <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                AfuChat Mail was created to provide a simple, secure, and powerful email solution for modern professionals and teams. We believe email should be fast, private, and accessible to everyone without compromising on features or security.
              </p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-2 text-center">
              <CardContent className="pt-8 pb-6">
                <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Focus</h3>
                <p className="text-muted-foreground">
                  Building the best email experience possible
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 text-center">
              <CardContent className="pt-8 pb-6">
                <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Privacy</h3>
                <p className="text-muted-foreground">
                  Your data belongs to you, always
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 text-center">
              <CardContent className="pt-8 pb-6">
                <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Innovation</h3>
                <p className="text-muted-foreground">
                  Constantly improving and evolving
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-2">
            <CardContent className="pt-8 pb-6">
              <h2 className="text-3xl font-bold mb-4">Why AfuChat Mail?</h2>
              <div className="space-y-4 text-lg text-muted-foreground">
                <p>
                  We started AfuChat Mail because we were frustrated with existing email services. They were either too complicated, invaded privacy with ads, or lacked essential features.
                </p>
                <p>
                  Our goal is simple: provide professional email addresses with enterprise-level features, while keeping it free and accessible to everyone. No hidden fees, no data mining, just pure email functionality.
                </p>
                <p>
                  Built with modern web technologies, AfuChat Mail delivers a fast, secure, and reliable email experience that works on any device.
                </p>
              </div>
            </CardContent>
          </Card>
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

export default About;
