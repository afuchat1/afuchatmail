import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Lock, Shield, Eye, Server, Key, FileCheck, ArrowRight, CheckCircle, ShieldCheck, Database, Globe, AlertTriangle } from "lucide-react";

const Security = () => {
  const navigate = useNavigate();

  const features = [
    { icon: Lock, title: "End-to-End Encryption", description: "All emails encrypted with AES-256 at rest and TLS 1.3 in transit. Your messages are unreadable to anyone but you." },
    { icon: Shield, title: "Advanced Spam Protection", description: "Multi-layer filtering combines IP reputation, content analysis, and machine learning to block spam, phishing, and malware." },
    { icon: Eye, title: "Zero Surveillance", description: "We never read, scan, or analyze your emails for advertising. Your inbox is private — no exceptions." },
    { icon: Server, title: "Enterprise Infrastructure", description: "Hosted on enterprise-grade servers with 24/7 monitoring, automatic failover, and geographic redundancy." },
    { icon: Key, title: "Strong Authentication", description: "Bcrypt password hashing, secure session management, and protection against brute-force attacks." },
    { icon: Database, title: "Encrypted Backups", description: "Geographically distributed backups with encryption at rest. Your data survives any single point of failure." },
  ];

  const practices = [
    "Regular third-party penetration testing and security audits",
    "Geographic redundancy across multiple data centers",
    "GDPR and CCPA compliance with full data protection controls",
    "Comprehensive incident response plan with <4 hour SLA",
    "Automated vulnerability scanning of all infrastructure",
    "Principle of least privilege for all internal access",
    "Secure software development lifecycle (SSDLC) practices",
    "Employee security training and background checks",
  ];

  const threats = [
    { title: "Phishing", description: "Multi-layer content analysis identifies and blocks phishing emails before they reach your inbox." },
    { title: "Malware", description: "Attachment scanning detects known malware signatures and suspicious file types." },
    { title: "Brute Force", description: "Rate limiting and account lockout protect against password guessing attacks." },
    { title: "Data Breach", description: "Encryption at rest means even if storage is compromised, data remains unreadable." },
  ];

  return (
    <PageLayout title="Security">
      <section className="pb-8">
        <h1 className="text-3xl font-black tracking-tight mb-3">Security</h1>
        <p className="text-lg text-muted-foreground font-medium leading-relaxed">
          Your data security is not an afterthought — it's engineered into every layer of AfuChat Mail.
        </p>
      </section>

      <section className="pb-8 space-y-3 text-muted-foreground leading-relaxed">
        <p>
          We built AfuChat Mail with a security-first mindset. From encryption to infrastructure to access controls, every decision is made to protect your data. We don't take shortcuts, and we don't make compromises.
        </p>
      </section>

      {/* Core Security Features */}
      <section className="py-8 border-t border-border">
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Protection</p>
        <h2 className="text-2xl font-black mb-6">How we protect your data</h2>
        <div className="space-y-5">
          {features.map((f, i) => (
            <div key={i} className="flex gap-4 items-start p-4 rounded-2xl bg-card border border-border shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                <f.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-bold mb-0.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Threat Protection */}
      <section className="py-8 border-t border-border">
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Threat Defense</p>
        <h2 className="text-2xl font-black mb-6">Active threat protection</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {threats.map((t, i) => (
            <div key={i} className="p-4 rounded-2xl bg-card border border-border shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h3 className="font-bold text-sm">{t.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">{t.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Security Practices */}
      <section className="py-8 border-t border-border">
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Standards</p>
        <h2 className="text-2xl font-black mb-6">Our security practices</h2>
        <div className="space-y-3">
          {practices.map((p, i) => (
            <div key={i} className="flex items-center gap-3">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-sm font-medium">{p}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance */}
      <section className="py-8 border-t border-border">
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Compliance</p>
        <h2 className="text-2xl font-black mb-6">Regulatory compliance</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { title: "GDPR", desc: "Full compliance with the EU General Data Protection Regulation. Data processing lawfully and transparently." },
            { title: "CCPA", desc: "Compliant with the California Consumer Privacy Act. Users can access, delete, and control their data." },
            { title: "SOC 2", desc: "Infrastructure designed to meet SOC 2 Type II standards for security, availability, and confidentiality." },
            { title: "ISO 27001", desc: "Information security management practices aligned with ISO 27001 standards." },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-2xl bg-card border border-border shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm">{item.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Report */}
      <section className="py-8 border-t border-border">
        <div className="p-5 rounded-2xl bg-accent/50 border border-border">
          <h3 className="font-bold mb-2">Report a Vulnerability</h3>
          <p className="text-sm text-muted-foreground font-medium leading-relaxed mb-3">
            If you discover a security vulnerability, please report it responsibly. We take all reports seriously and will respond within 24 hours.
          </p>
          <p className="text-sm font-bold">
            Email: <span className="text-primary">security@afuchat.com</span>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 text-center border-t border-border">
        <h2 className="text-2xl font-black mb-3">Start with confidence</h2>
        <p className="text-muted-foreground mb-6 font-medium">Your email, your data, your privacy.</p>
        <Button size="lg" className="rounded-xl shadow-md font-bold" onClick={() => navigate("/auth")}>
          Get Started Free
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </section>

      <div className="pb-16" />
    </PageLayout>
  );
};

export default Security;