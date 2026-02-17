import { PageLayout } from "@/components/PageLayout";
import { CheckCircle } from "lucide-react";

const Privacy = () => {
  const sections = [
    {
      title: "Our Commitment",
      content: "At AfuChat Mail, your privacy is paramount. This policy explains how we collect, use, and protect your personal information."
    },
    {
      title: "Information We Collect",
      items: [
        "Email address and credentials for authentication",
        "Email content you send and receive",
        "Usage data for service improvement",
        "IP address for security purposes"
      ]
    },
    {
      title: "How We Use It",
      items: [
        "To provide and maintain our email service",
        "To notify you about important changes",
        "To provide customer support",
        "To detect and prevent abuse",
        "To improve our service"
      ]
    },
    {
      title: "Data Protection",
      content: "We use AES-256 encryption, HTTPS connections, regular security audits, and redundant backup systems."
    },
    {
      title: "Your Rights",
      items: [
        "Access and download your data",
        "Correct inaccurate information",
        "Request account and data deletion",
        "Export your emails",
        "Opt-out of marketing"
      ]
    },
    {
      title: "Cookies",
      content: "We use only essential cookies for sessions and preferences. No tracking or advertising cookies."
    },
    {
      title: "Third Parties",
      content: "We do not share, sell, or rent your data. Disclosure only as required by law or to provide our service."
    },
    {
      title: "Contact",
      content: "Questions? Email privacy@afuchat.com. We respond within 48 hours."
    }
  ];

  return (
    <PageLayout>
      <section className="pt-12 pb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </section>

      <section className="pb-12 space-y-8">
        {sections.map((section, i) => (
          <div key={i}>
            <h2 className="font-semibold mb-2">{section.title}</h2>
            {section.content && (
              <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
            )}
            {section.items && (
              <ul className="space-y-1.5 mt-1">
                {section.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>
    </PageLayout>
  );
};

export default Privacy;
