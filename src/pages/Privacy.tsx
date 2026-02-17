import { PageLayout } from "@/components/PageLayout";
import { CheckCircle } from "lucide-react";

const Privacy = () => {
  return (
    <PageLayout title="Privacy Policy">
      <section className="pb-8">
        <h1 className="text-3xl font-black tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground font-medium">
          Last updated: January 15, 2026
        </p>
      </section>

      <section className="pb-8 space-y-4 text-muted-foreground leading-relaxed">
        <p>
          At AfuChat Mail, your privacy isn't a feature — it's the foundation. This policy explains in plain language what data we collect, how we use it, and what rights you have.
        </p>
        <p>
          <strong className="text-foreground">The short version:</strong> We collect only what's necessary to deliver your email. We never read your messages, never sell your data, and never show you ads.
        </p>
      </section>

      <div className="border-t border-border" />

      <section className="py-8">
        <h2 className="text-xl font-black mb-4">1. Information We Collect</h2>
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <div>
            <h3 className="font-bold text-foreground mb-1">Account Information</h3>
            <p>When you create an account, we collect your email address, password (securely hashed), and optional display name. This is the minimum required to authenticate you and provide the service.</p>
          </div>
          <div>
            <h3 className="font-bold text-foreground mb-1">Email Content</h3>
            <p>We store the emails you send and receive, including headers, body text, HTML content, and attachments. This data is encrypted at rest using AES-256 and is only accessible to you.</p>
          </div>
          <div>
            <h3 className="font-bold text-foreground mb-1">Usage Data</h3>
            <p>We collect anonymized usage metrics (page views, feature usage) to improve the service. This data cannot be linked to individual users.</p>
          </div>
          <div>
            <h3 className="font-bold text-foreground mb-1">Device Information</h3>
            <p>For push notifications, we store your device's push subscription endpoint. For security, we log IP addresses of login attempts.</p>
          </div>
        </div>
      </section>

      <div className="border-t border-border" />

      <section className="py-8">
        <h2 className="text-xl font-black mb-4">2. How We Use Your Data</h2>
        <ul className="space-y-2.5">
          {[
            "Delivering, storing, and displaying your email messages",
            "Authenticating your identity and securing your account",
            "Sending push notifications when you receive new emails",
            "Detecting and preventing spam, phishing, and abuse",
            "Providing customer support when you contact us",
            "Improving the service through anonymized analytics",
            "Complying with legal obligations when required by law",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="font-medium">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="border-t border-border" />

      <section className="py-8">
        <h2 className="text-xl font-black mb-4">3. Data Protection & Encryption</h2>
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>We take security seriously. Here's how we protect your data:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { title: "Encryption at Rest", desc: "All email data encrypted with AES-256" },
              { title: "Encryption in Transit", desc: "TLS 1.3 for all connections" },
              { title: "Password Security", desc: "Bcrypt hashing, never stored in plain text" },
              { title: "Infrastructure", desc: "Enterprise-grade servers with 24/7 monitoring" },
              { title: "Backups", desc: "Geographically redundant encrypted backups" },
              { title: "Auditing", desc: "Regular third-party security audits" },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-xl bg-card border border-border">
                <p className="font-bold text-foreground text-xs mb-0.5">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-border" />

      <section className="py-8">
        <h2 className="text-xl font-black mb-4">4. What We Don't Do</h2>
        <div className="p-5 rounded-2xl bg-accent/50 border border-border space-y-2.5">
          {[
            "We never read or scan your email content for advertising",
            "We never sell, rent, or share your personal data with third parties",
            "We never use tracking pixels or fingerprinting",
            "We never show targeted or behavioral advertising",
            "We never train AI models on your email data",
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm">
              <span className="text-destructive font-bold">✕</span>
              <span className="font-medium text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-border" />

      <section className="py-8">
        <h2 className="text-xl font-black mb-4">5. Your Rights</h2>
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p className="font-medium">You have the right to:</p>
          <ul className="space-y-2">
            {[
              "Access and download all your data at any time",
              "Correct any inaccurate personal information",
              "Request complete deletion of your account and all data",
              "Export your emails in standard formats",
              "Opt out of any non-essential communications",
              "Know exactly what data we hold about you",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="border-t border-border" />

      <section className="py-8">
        <h2 className="text-xl font-black mb-4">6. Cookies</h2>
        <p className="text-sm text-muted-foreground leading-relaxed font-medium">
          We use only essential cookies required for authentication and session management. We do not use analytics cookies, advertising cookies, or any third-party tracking cookies. Your session cookie is encrypted and expires after 7 days of inactivity.
        </p>
      </section>

      <div className="border-t border-border" />

      <section className="py-8">
        <h2 className="text-xl font-black mb-4">7. Data Retention</h2>
        <p className="text-sm text-muted-foreground leading-relaxed font-medium">
          Your email data is retained as long as your account is active. Deleted emails are moved to trash and permanently removed after 30 days. When you delete your account, all associated data is permanently erased within 14 days. Backup copies are purged within 30 days.
        </p>
      </section>

      <div className="border-t border-border" />

      <section className="py-8">
        <h2 className="text-xl font-black mb-4">8. Compliance</h2>
        <p className="text-sm text-muted-foreground leading-relaxed font-medium">
          AfuChat Mail is designed to comply with GDPR (General Data Protection Regulation), CCPA (California Consumer Privacy Act), and other applicable data protection laws. We process data lawfully, transparently, and only for specified purposes.
        </p>
      </section>

      <div className="border-t border-border" />

      <section className="py-8">
        <h2 className="text-xl font-black mb-4">9. Changes to This Policy</h2>
        <p className="text-sm text-muted-foreground leading-relaxed font-medium">
          We may update this privacy policy from time to time. Material changes will be communicated via email to all registered users at least 30 days before they take effect. The date at the top of this page always reflects the latest version.
        </p>
      </section>

      <div className="border-t border-border" />

      <section className="py-8">
        <h2 className="text-xl font-black mb-4">10. Contact Us</h2>
        <p className="text-sm text-muted-foreground leading-relaxed font-medium mb-4">
          If you have questions about this privacy policy or want to exercise your data rights, contact our privacy team:
        </p>
        <div className="p-4 rounded-xl bg-card border border-border space-y-1">
          <p className="text-sm font-bold">Email: <span className="text-primary">privacy@afuchat.com</span></p>
          <p className="text-sm font-bold">Response time: <span className="text-muted-foreground font-medium">Within 48 hours</span></p>
        </div>
      </section>

      <div className="pb-16" />
    </PageLayout>
  );
};

export default Privacy;