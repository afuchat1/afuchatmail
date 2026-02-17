import { PageLayout } from "@/components/PageLayout";

const Terms = () => {
  const sections = [
    { title: "Agreement", content: "By using AfuChat Mail, you agree to these terms. If you disagree, please don't use our service." },
    { title: "Service", content: "AfuChat Mail provides email hosting with custom addresses, aliases, and related features. We may modify the service with reasonable notice." },
    { title: "Acceptable Use", content: "Don't use AfuChat Mail for spam, malware, harassment, illegal activities, impersonation, or IP violations." },
    { title: "Account", content: "Keep your credentials secure. Provide accurate info. Must be 13+ years old. One account per person unless authorized." },
    { title: "Content", content: "You own your content. We don't claim ownership. You grant us a limited license to store and transmit your content to provide the service." },
    { title: "Availability", content: "We target 99.9% uptime but don't guarantee uninterrupted service. Maintenance announced in advance when possible." },
    { title: "Termination", content: "We may suspend accounts violating these terms. You can cancel anytime. Data retained 30 days after termination." },
    { title: "Liability", content: "Service provided \"as is.\" We're not liable for indirect damages including loss of data, profits, or business opportunities." },
    { title: "Changes", content: "We may update these terms. Material changes notified by email. Continued use means acceptance." },
    { title: "Contact", content: "Questions? Email legal@afuchat.com. We respond within 48 business hours." },
  ];

  return (
    <PageLayout>
      <section className="pt-12 pb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </section>

      <section className="pb-12 space-y-8">
        {sections.map((section, i) => (
          <div key={i}>
            <h2 className="font-semibold mb-2">{section.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
          </div>
        ))}
      </section>
    </PageLayout>
  );
};

export default Terms;
