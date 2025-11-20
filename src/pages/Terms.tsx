import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";

const Terms = () => {
  const navigate = useNavigate();

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
            Terms of Service
          </h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <Card className="max-w-4xl mx-auto border-2">
          <CardContent className="pt-8 pb-6 space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">Agreement to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using AfuChat Mail, you agree to be bound by these Terms of Service and all applicable laws and regulations.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Service Description</h2>
              <p className="text-muted-foreground leading-relaxed">
                AfuChat Mail provides email hosting and communication services. We reserve the right to modify or discontinue any aspect of the service at any time.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Acceptable Use</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You agree not to use AfuChat Mail for:
              </p>
              <ul className="space-y-3 text-muted-foreground">
                <li>• Sending spam or unsolicited emails</li>
                <li>• Distributing malware or viruses</li>
                <li>• Harassment or abusive behavior</li>
                <li>• Illegal activities</li>
                <li>• Impersonating others</li>
                <li>• Violating intellectual property rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Account Responsibilities</h2>
              <ul className="space-y-3 text-muted-foreground">
                <li>• You are responsible for maintaining account security</li>
                <li>• You must provide accurate registration information</li>
                <li>• You must be at least 13 years old to use our service</li>
                <li>• One person or legal entity may not maintain multiple accounts</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Content Ownership</h2>
              <p className="text-muted-foreground leading-relaxed">
                You retain all rights to the content you create and send through AfuChat Mail. We do not claim ownership of your emails or data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Service Availability</h2>
              <p className="text-muted-foreground leading-relaxed">
                While we strive for 99.9% uptime, we do not guarantee uninterrupted service. Scheduled maintenance will be announced in advance when possible.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to suspend or terminate accounts that violate these terms. You may cancel your account at any time through the settings page.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                AfuChat Mail is provided "as is" without warranties. We are not liable for any indirect, incidental, or consequential damages arising from use of our service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these terms, contact us at legal@afuchat.com
              </p>
            </section>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Terms;
