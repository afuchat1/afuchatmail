import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Mail, Shield, Lock, Eye, Server, CheckCircle, ArrowLeft } from "lucide-react";

const Security = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Lock,
      title: "End-to-End Encryption",
      description: "All emails are encrypted in transit and at rest using industry-standard AES-256 encryption"
    },
    {
      icon: Shield,
      title: "Advanced Spam Protection",
      description: "Multi-layer spam filtering keeps your inbox clean and protects against phishing attempts"
    },
    {
      icon: Eye,
      title: "No Tracking",
      description: "We don't track your emails, read your messages, or sell your data to third parties"
    },
    {
      icon: Server,
      title: "Secure Infrastructure",
      description: "Hosted on enterprise-grade servers with regular security audits and monitoring"
    },
    {
      icon: CheckCircle,
      title: "Two-Factor Authentication",
      description: "Optional 2FA adds an extra layer of security to your account"
    },
    {
      icon: Lock,
      title: "Password Protection",
      description: "Passwords are hashed using bcrypt and never stored in plain text"
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
            Security & Privacy
          </h1>
          <p className="text-xl text-muted-foreground">
            Your data security is our top priority
          </p>
        </div>

        <div className="max-w-4xl mx-auto mb-12">
          <Card className="border-2 bg-primary/5">
            <CardContent className="pt-8 pb-6">
              <div className="flex items-start gap-4">
                <Shield className="h-12 w-12 text-primary flex-shrink-0" />
                <div>
                  <h2 className="text-2xl font-bold mb-3">Bank-Level Security</h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    AfuChat Mail uses the same encryption standards as major financial institutions. Your emails are protected with multiple layers of security to ensure they remain private and secure.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:shadow-lg transition-all duration-300">
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

        <Card className="max-w-4xl mx-auto border-2">
          <CardContent className="pt-8 pb-6 space-y-6">
            <h2 className="text-3xl font-bold">Our Security Practices</h2>
            
            <section>
              <h3 className="text-xl font-semibold mb-3">Regular Security Audits</h3>
              <p className="text-muted-foreground leading-relaxed">
                We conduct regular security audits and penetration testing to identify and fix vulnerabilities before they can be exploited.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3">Data Backup & Recovery</h3>
              <p className="text-muted-foreground leading-relaxed">
                Your emails are automatically backed up to multiple secure locations. In the event of data loss, we can restore your emails quickly and completely.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3">GDPR Compliant</h3>
              <p className="text-muted-foreground leading-relaxed">
                We comply with GDPR and other international privacy regulations. You have full control over your data and can request deletion at any time.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3">Incident Response</h3>
              <p className="text-muted-foreground leading-relaxed">
                In the unlikely event of a security incident, we have a comprehensive response plan to minimize impact and notify affected users immediately.
              </p>
            </section>
          </CardContent>
        </Card>

        <div className="text-center mt-16">
          <Button size="lg" onClick={() => navigate("/auth")}>
            Get Started Securely
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Security;
