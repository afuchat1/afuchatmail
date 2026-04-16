import { useNavigate } from "react-router-dom";
import { ArrowRight, Bell, KeyRound, LifeBuoy, MailPlus, Search, Settings2 } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";

const HelpCenter = () => {
  const navigate = useNavigate();

  const categories = [
    { icon: MailPlus, title: "Create addresses", description: "Set up your primary @afuchat.com address and organize aliases." },
    { icon: Search, title: "Search and folders", description: "Find mail quickly and keep messages grouped by workflow." },
    { icon: Bell, title: "Notifications", description: "Enable push alerts and decide which messages deserve attention." },
    { icon: KeyRound, title: "Account access", description: "Sign in securely, reset credentials, and review connected sessions." },
    { icon: Settings2, title: "Preferences", description: "Customize signatures, display settings, and inbox behavior." },
    { icon: LifeBuoy, title: "Support", description: "Contact the AfuChat team for account or product help." },
  ];

  const articles = [
    "How to create your first AfuChat Mail address",
    "How aliases work and when to use them",
    "How to install AfuChat Mail as a mobile app",
    "How to prepare for custom domains",
    "How OAuth developer apps protect user access",
    "How to keep your inbox private and secure",
  ];

  return (
    <PageLayout title="Help Center">
      <section className="pb-10">
        <h1 className="mb-3 text-3xl font-black tracking-tight md:text-5xl">Help for every part of AfuChat Mail.</h1>
        <p className="max-w-2xl text-lg font-medium leading-8 text-muted-foreground">
          Find practical guidance for accounts, aliases, inbox organization, mobile usage, and developer access.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category, index) => (
          <article key={category.title} className="rounded-2xl bg-background p-5 shadow-xs">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <category.icon className="h-4 w-4" />
            </div>
            <h2 className="text-base font-black" data-testid={`text-help-category-${index}`}>{category.title}</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">{category.description}</p>
          </article>
        ))}
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-3xl bg-background p-6">
          <p className="text-xs font-black uppercase tracking-wider text-primary">Popular articles</p>
          <div className="mt-4 divide-y divide-border">
            {articles.map((article, index) => (
              <button
                key={article}
                className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-black hover:text-primary"
                data-testid={`button-help-article-${index}`}
              >
                {article}
                <ArrowRight className="h-4 w-4 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
        <aside className="rounded-3xl bg-accent/40 p-6">
          <h2 className="text-xl font-black">Need direct help?</h2>
          <p className="mt-3 text-sm font-medium leading-7 text-muted-foreground">
            Send a message to support and include your account email, device, and what you were trying to do.
          </p>
          <Button className="mt-6 h-11 w-full rounded-xl font-black shadow-none" onClick={() => navigate("/contact")} data-testid="button-help-contact">
            Contact support
          </Button>
        </aside>
      </section>
    </PageLayout>
  );
};

export default HelpCenter;