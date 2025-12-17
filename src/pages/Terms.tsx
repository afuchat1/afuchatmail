import { PageLayout } from "@/components/PageLayout";
import { Badge } from "@/components/ui/badge";
import { FileText, Scale, UserCheck, AlertTriangle, Database, Clock, XCircle, AlertOctagon, RefreshCw, Mail } from "lucide-react";

const Terms = () => {
  const sections = [
    {
      icon: Scale,
      title: "Agreement to Terms",
      content: "By accessing and using AfuChat Mail, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this service."
    },
    {
      icon: FileText,
      title: "Service Description",
      content: "AfuChat Mail provides email hosting and communication services including custom email addresses, email aliases, and related features. We reserve the right to modify or discontinue any aspect of the service at any time with reasonable notice to users."
    },
    {
      icon: AlertTriangle,
      title: "Acceptable Use",
      content: "You agree not to use AfuChat Mail for: sending spam or unsolicited emails, distributing malware or viruses, harassment or abusive behavior, illegal activities of any kind, impersonating others or misrepresentation, or violating intellectual property rights."
    },
    {
      icon: UserCheck,
      title: "Account Responsibilities",
      content: "You are responsible for maintaining the security of your account credentials. You must provide accurate registration information. Users must be at least 13 years old. One person or legal entity may maintain only one account unless explicitly authorized."
    },
    {
      icon: Database,
      title: "Content Ownership",
      content: "You retain all rights to the content you create and send through AfuChat Mail. We do not claim ownership of your emails, attachments, or personal data. By using our service, you grant us a limited license to store and transmit your content as necessary to provide the service."
    },
    {
      icon: Clock,
      title: "Service Availability",
      content: "While we strive for 99.9% uptime, we do not guarantee uninterrupted service. Scheduled maintenance will be announced in advance when possible. We are not liable for any disruptions due to circumstances beyond our reasonable control."
    },
    {
      icon: XCircle,
      title: "Termination",
      content: "We reserve the right to suspend or terminate accounts that violate these terms without prior notice. You may cancel your account at any time through the settings page. Upon termination, your data will be retained for 30 days before permanent deletion."
    },
    {
      icon: AlertOctagon,
      title: "Limitation of Liability",
      content: "AfuChat Mail is provided \"as is\" without warranties of any kind. We are not liable for any indirect, incidental, special, consequential, or punitive damages arising from use of our service, including but not limited to loss of data, profits, or business opportunities."
    },
    {
      icon: RefreshCw,
      title: "Changes to Terms",
      content: "We may update these terms at any time. Material changes will be notified via email or service announcement. Continued use of the service after changes constitutes acceptance of the new terms. We recommend reviewing these terms periodically."
    },
    {
      icon: Mail,
      title: "Contact Information",
      content: "For questions about these terms or to report violations, contact us at legal@afuchat.com. We aim to respond to all inquiries within 48 business hours."
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
              <span className="bg-gradient-primary bg-clip-text text-transparent">Terms of Service</span>
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
                <div>
                  <h2 className="text-xl font-semibold mb-2">{section.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{section.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageLayout>
  );
};

export default Terms;