import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Lock, Shield, Eye, Server, Key, FileCheck, ArrowRight, CheckCircle } from "lucide-react";

const Security = () => {
  const navigate = useNavigate();

  const features = [
    { icon: Lock, title: "End-to-End Encryption", description: "AES-256 encryption at rest and in transit." },
    { icon: Shield, title: "Spam Protection", description: "Multi-layer filtering against phishing and malware." },
    { icon: Eye, title: "No Tracking", description: "We don't read your emails or sell your data." },
    { icon: Server, title: "Secure Infrastructure", description: "Enterprise servers with 24/7 monitoring." },
    { icon: Key, title: "Two-Factor Auth", description: "Optional 2FA with authenticator apps." },
    { icon: FileCheck, title: "Strong Passwords", description: "Bcrypt hashing, never stored in plain text." },
  ];

  const practices = [
    "Regular third-party security audits",
    "Geographic redundancy for backups",
    "GDPR and CCPA compliant",
    "Comprehensive incident response plan",
  ];

  return (
    <PageLayout>
      <section className="pt-12 pb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Security</h1>
        <p className="text-muted-foreground">Your data security is our top priority.</p>
      </section>

      <section className="pb-8">
        <div className="space-y-6">
          {features.map((f, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <f.icon className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h3 className="font-semibold mb-0.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t" />

      <section className="py-8">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Our practices</h2>
        <div className="space-y-3">
          {practices.map((p, i) => (
            <div key={i} className="flex items-center gap-3">
              <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm">{p}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="py-12 text-center border-t">
        <h2 className="text-xl font-bold mb-3">Start securely</h2>
        <Button size="lg" onClick={() => navigate("/auth")}>
          Get Started Free
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </section>
    </PageLayout>
  );
};

export default Security;
