import { PageLayout } from "@/components/PageLayout";
import { Badge } from "@/components/ui/badge";
import { Shield, Database, Lock, Eye, Users, Cookie, Share2, Mail, CheckCircle } from "lucide-react";

const Privacy = () => {
  const sections = [
    {
      icon: Shield,
      title: "Our Commitment to Privacy",
      content: "At AfuChat Mail, we take your privacy seriously. This policy explains how we collect, use, and protect your personal information. We believe your data belongs to you, and we're committed to being transparent about our practices."
    },
    {
      icon: Database,
      title: "Information We Collect",
      items: [
        "Email address and account credentials for authentication",
        "Email content you send and receive through our service",
        "Usage data and device information for service improvement",
        "IP address for security and fraud prevention purposes"
      ]
    },
    {
      icon: Eye,
      title: "How We Use Your Information",
      items: [
        "To provide and maintain our email service",
        "To notify you about important changes to our service",
        "To provide customer support when you need assistance",
        "To detect, prevent, and address abuse or security issues",
        "To improve our service based on usage patterns"
      ]
    },
    {
      icon: Lock,
      title: "Data Protection",
      content: "We implement industry-standard security measures including end-to-end encryption for email storage, secure HTTPS connections for all data transmission, regular security audits by third parties, and redundant backup and disaster recovery systems."
    },
    {
      icon: Users,
      title: "Your Rights",
      items: [
        "Access and download your personal data at any time",
        "Correct any inaccurate information in your profile",
        "Request complete deletion of your account and data",
        "Export your emails in standard formats",
        "Opt-out of marketing communications"
      ]
    },
    {
      icon: Cookie,
      title: "Cookies",
      content: "We use only essential cookies to maintain your session and remember your preferences. We do not use tracking or advertising cookies. Third-party analytics cookies can be disabled in your account settings."
    },
    {
      icon: Share2,
      title: "Third-Party Services",
      content: "We do not share, sell, or rent your personal data to third parties. Data may only be disclosed as required by law, to protect our rights, or to provide our service (e.g., email delivery infrastructure). All service providers are bound by strict confidentiality agreements."
    },
    {
      icon: Mail,
      title: "Contact Us",
      content: "If you have questions about this privacy policy or want to exercise your rights, please contact us at privacy@afuchat.com. We aim to respond to all privacy-related inquiries within 48 hours."
    }
  ];

  return (
    <PageLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="container mx-auto px-4 pt-16 pb-12 relative">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-4">Legal</Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="bg-gradient-primary bg-clip-text text-transparent">Privacy Policy</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {sections.map((section, index) => (
            <div key={index} className="group">
              <div className="flex items-start gap-4 p-6 rounded-xl border bg-card hover:border-primary/50 transition-colors">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <section.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">{section.title}</h2>
                  {section.content && (
                    <p className="text-muted-foreground leading-relaxed">{section.content}</p>
                  )}
                  {section.items && (
                    <ul className="space-y-2 mt-2">
                      {section.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageLayout>
  );
};

export default Privacy;