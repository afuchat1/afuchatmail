import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const About = () => {
  const navigate = useNavigate();

  return (
    <PageLayout>
      <section className="pt-12 pb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">About</h1>
        <p className="text-muted-foreground">Building the future of email.</p>
      </section>

      <section className="pb-8 space-y-4 text-muted-foreground leading-relaxed">
        <p>
          AfuChat Mail was created because we were frustrated with existing email services — too complicated, privacy-invasive, or missing essential features.
        </p>
        <p>
          Our vision: simple, secure, and powerful email that respects users. No hidden fees, no data mining, just pure email built for the way people work today.
        </p>
        <p>
          Built with modern web technologies, AfuChat Mail delivers a fast, reliable experience across all devices.
        </p>
      </section>

      <section className="py-8 border-t">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-6">What we stand for</h2>
        <div className="space-y-5">
          <div>
            <h3 className="font-semibold mb-0.5">Focus</h3>
            <p className="text-sm text-muted-foreground">Building the best email experience, without distractions.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-0.5">Privacy</h3>
            <p className="text-sm text-muted-foreground">Your data belongs to you. No tracking, no ads, no compromises.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-0.5">Innovation</h3>
            <p className="text-sm text-muted-foreground">Constantly evolving to meet modern communication needs.</p>
          </div>
        </div>
      </section>

      <section className="py-12 text-center border-t">
        <h2 className="text-xl font-bold mb-3">Join us</h2>
        <Button size="lg" onClick={() => navigate("/auth")}>
          Get Started Free
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </section>
    </PageLayout>
  );
};

export default About;
