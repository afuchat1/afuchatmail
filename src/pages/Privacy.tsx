import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";

const Privacy = () => {
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
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <Card className="max-w-4xl mx-auto border-2">
          <CardContent className="pt-8 pb-6 space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">Our Commitment to Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                At AfuChat Mail, we take your privacy seriously. This policy explains how we collect, use, and protect your personal information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Information We Collect</h2>
              <ul className="space-y-3 text-muted-foreground">
                <li>• Email address and account credentials</li>
                <li>• Email content you send and receive</li>
                <li>• Usage data and device information</li>
                <li>• IP address for security purposes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">How We Use Your Information</h2>
              <ul className="space-y-3 text-muted-foreground">
                <li>• To provide and maintain our email service</li>
                <li>• To notify you about changes to our service</li>
                <li>• To provide customer support</li>
                <li>• To detect and prevent abuse</li>
                <li>• To improve our service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Data Protection</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="space-y-3 text-muted-foreground">
                <li>• End-to-end encryption for email storage</li>
                <li>• Secure HTTPS connections</li>
                <li>• Regular security audits</li>
                <li>• Data backup and recovery systems</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="space-y-3 text-muted-foreground">
                <li>• Access your personal data</li>
                <li>• Correct inaccurate data</li>
                <li>• Request deletion of your data</li>
                <li>• Export your data</li>
                <li>• Opt-out of marketing communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use essential cookies to maintain your session and preferences. We do not use tracking or advertising cookies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Third-Party Services</h2>
              <p className="text-muted-foreground leading-relaxed">
                We do not share your data with third parties except as required by law or to provide our service (e.g., email delivery infrastructure).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about this privacy policy, please contact us at privacy@afuchat.com
              </p>
            </section>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Privacy;
