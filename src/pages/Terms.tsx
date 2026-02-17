import { PageLayout } from "@/components/PageLayout";

const Terms = () => {
  return (
    <PageLayout title="Terms of Service">
      <section className="pb-8">
        <h1 className="text-3xl font-black tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground font-medium">
          Last updated: January 15, 2026
        </p>
      </section>

      <section className="pb-8 text-sm text-muted-foreground leading-relaxed">
        <p className="font-medium">
          These Terms of Service ("Terms") govern your use of AfuChat Mail and its related services. By creating an account or using the service, you agree to be bound by these Terms. If you do not agree, please do not use AfuChat Mail.
        </p>
      </section>

      <div className="border-t border-border" />

      <section className="py-8">
        <h2 className="text-xl font-black mb-4">1. Service Description</h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3 font-medium">
          <p>AfuChat Mail provides email hosting services including:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Custom @afuchat.com email addresses</li>
            <li>Email aliases that forward to your primary inbox</li>
            <li>Email composition, sending, receiving, and storage</li>
            <li>Push notifications for new messages</li>
            <li>Scheduled email sending</li>
            <li>Email templates and signatures</li>
            <li>OAuth-based API access for third-party integrations</li>
            <li>Progressive web app with offline access</li>
          </ul>
          <p>We may modify, update, or discontinue specific features with reasonable notice. Core email functionality (sending and receiving) will always remain available.</p>
        </div>
      </section>

      <div className="border-t border-border" />

      <section className="py-8">
        <h2 className="text-xl font-black mb-4">2. Account Registration</h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3 font-medium">
          <p>To use AfuChat Mail, you must create an account. You agree to:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Provide accurate and complete registration information</li>
            <li>Maintain the security of your password and account credentials</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>
          <p>You must be at least 13 years of age to use AfuChat Mail. Users under 18 should have parental or guardian consent. Each person may create one primary account unless explicitly authorized for additional accounts.</p>
        </div>
      </section>

      <div className="border-t border-border" />

      <section className="py-8">
        <h2 className="text-xl font-black mb-4">3. Acceptable Use</h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3 font-medium">
          <p>You agree not to use AfuChat Mail for:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Sending unsolicited bulk email (spam) or commercial messages without consent</li>
            <li>Distributing malware, viruses, or other harmful software</li>
            <li>Harassment, threats, or intimidation of any person</li>
            <li>Any illegal activities under applicable local, state, or international law</li>
            <li>Impersonation of any person or entity</li>
            <li>Distribution of content that infringes intellectual property rights</li>
            <li>Attempting to gain unauthorized access to other accounts or systems</li>
            <li>Automated scraping, data mining, or mass email harvesting</li>
          </ul>
          <p>Violations may result in immediate account suspension or termination without prior notice.</p>
        </div>
      </section>

      <div className="border-t border-border" />

      <section className="py-8">
        <h2 className="text-xl font-black mb-4">4. Email Addresses & Aliases</h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3 font-medium">
          <p>When you create an @afuchat.com email address:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>The address is assigned to your account on a first-come, first-served basis</li>
            <li>Addresses must be 3-30 characters using lowercase letters, numbers, dots, and hyphens</li>
            <li>We reserve the right to reclaim addresses that violate our policies or impersonate brands</li>
            <li>Aliases forward to your primary address and share the same inbox</li>
            <li>Inactive addresses (no login for 12+ months) may be reclaimed after notice</li>
          </ul>
        </div>
      </section>

      <div className="border-t border-border" />

      <section className="py-8">
        <h2 className="text-xl font-black mb-4">5. Content Ownership</h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3 font-medium">
          <p>
            You retain full ownership of all content you create, send, or receive through AfuChat Mail. We do not claim any intellectual property rights over your email content.
          </p>
          <p>
            By using the service, you grant AfuChat Mail a limited, non-exclusive license to store, process, and transmit your content solely for the purpose of providing the email service. This license terminates when you delete your content or close your account.
          </p>
        </div>
      </section>

      <div className="border-t border-border" />

      <section className="py-8">
        <h2 className="text-xl font-black mb-4">6. Service Availability</h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3 font-medium">
          <p>
            We target 99.9% service availability but do not guarantee uninterrupted or error-free operation. Scheduled maintenance will be announced in advance when possible, typically during off-peak hours.
          </p>
          <p>
            We are not liable for service interruptions caused by events beyond our reasonable control, including but not limited to natural disasters, network outages, or government actions.
          </p>
        </div>
      </section>

      <div className="border-t border-border" />

      <section className="py-8">
        <h2 className="text-xl font-black mb-4">7. API & Developer Access</h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3 font-medium">
          <p>
            If you use the AfuChat Mail API through the Developer Portal, additional terms apply:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>API access is provided for legitimate integration purposes only</li>
            <li>Rate limits apply and are enforced per application</li>
            <li>You must not use the API to access data you are not authorized to view</li>
            <li>OAuth tokens must be stored securely and not shared</li>
            <li>We may revoke API access for violations without prior notice</li>
          </ul>
        </div>
      </section>

      <div className="border-t border-border" />

      <section className="py-8">
        <h2 className="text-xl font-black mb-4">8. Termination</h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3 font-medium">
          <p>
            You may cancel your account at any time through the Settings page. Upon cancellation, your data will be retained for 30 days to allow recovery, after which it will be permanently deleted.
          </p>
          <p>
            We may suspend or terminate accounts that violate these Terms, engage in abusive behavior, or remain inactive for extended periods (12+ months). We will provide notice when reasonably possible.
          </p>
        </div>
      </section>

      <div className="border-t border-border" />

      <section className="py-8">
        <h2 className="text-xl font-black mb-4">9. Limitation of Liability</h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3 font-medium">
          <p>
            AfuChat Mail is provided "as is" without warranties of any kind, either express or implied. To the maximum extent permitted by law, we are not liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, profits, or business opportunities.
          </p>
          <p>
            Our total liability for any claim arising from your use of the service shall not exceed the amount you have paid us in the 12 months preceding the claim (if applicable).
          </p>
        </div>
      </section>

      <div className="border-t border-border" />

      <section className="py-8">
        <h2 className="text-xl font-black mb-4">10. Changes to Terms</h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3 font-medium">
          <p>
            We may update these Terms from time to time. Material changes will be communicated via email to all registered users at least 30 days before they take effect. Continued use of the service after changes take effect constitutes acceptance of the updated Terms.
          </p>
        </div>
      </section>

      <div className="border-t border-border" />

      <section className="py-8">
        <h2 className="text-xl font-black mb-4">11. Contact</h2>
        <p className="text-sm text-muted-foreground leading-relaxed font-medium mb-4">
          If you have questions about these Terms, please contact us:
        </p>
        <div className="p-4 rounded-xl bg-card border border-border space-y-1">
          <p className="text-sm font-bold">Email: <span className="text-primary">legal@afuchat.com</span></p>
          <p className="text-sm font-bold">Response time: <span className="text-muted-foreground font-medium">Within 48 business hours</span></p>
        </div>
      </section>

      <div className="pb-16" />
    </PageLayout>
  );
};

export default Terms;