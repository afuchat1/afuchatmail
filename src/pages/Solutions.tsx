import { ArrowRight, Briefcase, Code2, ShieldCheck, UserRoundCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";

const Solutions = () => {
  const navigate = useNavigate();

  const solutions = [
    {
      icon: Briefcase,
      title: "Freelancers and consultants",
      description: "Separate client work, proposals, invoices, and operations without creating multiple accounts.",
      bullets: ["Dedicated aliases per client", "Clean professional sending identity", "Fast search across conversations"],
    },
    {
      icon: UserRoundCheck,
      title: "Creators and founders",
      description: "Run newsletters, product signups, and support channels from one focused workspace.",
      bullets: ["Newsletter and product aliases", "Simple support routing", "Mobile-first inbox management"],
    },
    {
      icon: Code2,
      title: "Developers and builders",
      description: "Use OAuth apps and API access to connect AfuChat Mail to your own workflows.",
      bullets: ["Developer portal", "Scoped OAuth permissions", "Integration-ready mail flows"],
    },
    {
      icon: ShieldCheck,
      title: "Privacy-conscious teams",
      description: "Avoid ad-funded inboxes while keeping the experience familiar, fast, and easy to adopt.",
      bullets: ["No ad profiling", "Secure account access", "Plain-language privacy posture"],
    },
  ];

  return (
    <PageLayout title="Solutions">
      <section className="pb-10">
        <h1 className="mb-3 text-3xl font-black tracking-tight md:text-5xl">Built for modern work, not inbox clutter.</h1>
        <p className="max-w-2xl text-lg font-medium leading-8 text-muted-foreground">
          AfuChat Mail fits personal professionals, small teams, developers, and privacy-first workflows.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {solutions.map((solution, index) => (
          <article key={solution.title} className="rounded-3xl bg-background p-6 shadow-xs">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <solution.icon className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-black" data-testid={`text-solution-title-${index}`}>{solution.title}</h2>
            <p className="mt-3 text-sm font-medium leading-7 text-muted-foreground">{solution.description}</p>
            <div className="mt-5 space-y-2">
              {solution.bullets.map((bullet) => (
                <div key={bullet} className="rounded-xl bg-card px-3 py-2 text-sm font-bold">
                  {bullet}
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="mt-10 rounded-3xl bg-card p-6 text-center">
        <h2 className="text-2xl font-black">Ready to set up your workspace?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-7 text-muted-foreground">
          Start with a free address, then build aliases and workflows around how you actually work.
        </p>
        <Button className="mt-6 h-11 rounded-xl font-black shadow-none" onClick={() => navigate("/auth")} data-testid="button-solutions-start">
          Get started
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </section>
    </PageLayout>
  );
};

export default Solutions;