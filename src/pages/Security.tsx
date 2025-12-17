import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, Eye, Server, CheckCircle, Key, FileCheck, AlertTriangle, Globe, ArrowRight } from "lucide-react";

const Security = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Lock,
      title: "End-to-End Encryption",
      description: "All emails are encrypted in transit and at rest using industry-standard AES-256 encryption. Your messages can only be read by you."
    },
    {
      icon: Shield,
      title: "Advanced Spam Protection",
      description: "Multi-layer spam filtering keeps your inbox clean and protects against phishing, malware, and social engineering attacks."
    },
    {
      icon: Eye,
      title: "No Tracking",
      description: "We don't track your emails, read your messages, or sell your data to third parties. Your privacy is our priority."
    },
    {
      icon: Server,
      title: "Secure Infrastructure",
      description: "Hosted on enterprise-grade servers with regular security audits, 24/7 monitoring, and DDoS protection."
    },
    {
      icon: Key,
      title: "Two-Factor Authentication",
      description: "Optional 2FA adds an extra layer of security to your account. Support for authenticator apps and security keys."
    },
    {
      icon: FileCheck,
      title: "Password Protection",
      description: "Passwords are hashed using bcrypt with salt. We never store plain text passwords and enforce strong password policies."
    }
  ];

  const practices = [
    {
      title: "Regular Security Audits",
      description: "We conduct regular security audits and penetration testing by third-party security firms to identify and fix vulnerabilities."
    },
    {
      title: "Data Backup & Recovery",
      description: "Your emails are automatically backed up to multiple secure locations with geographic redundancy. Quick recovery in case of any issues."
    },
    {
      title: "GDPR Compliant",
      description: "We comply with GDPR, CCPA, and other international privacy regulations. Full control over your data with easy export and deletion."
    },
    {
      title: "Incident Response",
      description: "Comprehensive incident response plan with immediate notification to affected users. Transparent communication about any security events."
    }
  ];

  return (
    <PageLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="container mx-auto px-4 pt-16 pb-12 relative">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-4">Security</Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="bg-gradient-primary bg-clip-text text-transparent">Security & Privacy</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Your data security is our top priority
            </p>
          </div>
        </div>
      </section>

      {/* Hero Card */}
      <section className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5">
          <CardContent className="pt-8 pb-6">
            <div className="flex items-start gap-6">
              <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                <Shield className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <Badge className="mb-2 bg-primary/10 text-primary">Bank-Level Security</Badge>
                <h2 className="text-2xl font-bold mb-3">Enterprise-Grade Protection</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  AfuChat Mail uses the same encryption standards as major financial institutions. Your emails are protected with multiple layers of security including AES-256 encryption, TLS 1.3, and zero-knowledge architecture.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Security Features */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card key={index} className="group border-2 hover:border-primary/50 transition-all duration-300">
              <CardContent className="pt-8 pb-6">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Security Practices */}
      <section className="bg-muted/30 border-y">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">Our Practices</Badge>
              <h2 className="text-3xl md:text-4xl font-bold">How We Protect Your Data</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {practices.map((practice, index) => (
                <div key={index} className="flex items-start gap-4 p-6 rounded-xl bg-background border">
                  <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-2">{practice.title}</h3>
                    <p className="text-sm text-muted-foreground">{practice.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Start Securely Today</h2>
          <p className="text-muted-foreground mb-8">
            Experience enterprise-grade security with our free plan
          </p>
          <Button size="lg" onClick={() => navigate("/auth")}>
            Get Started Securely
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </PageLayout>
  );
};

export default Security;