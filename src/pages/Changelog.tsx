import { CalendarDays, CheckCircle, Code2, LayoutDashboard, Smartphone } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";

const Changelog = () => {
  const releases = [
    {
      version: "2026.04",
      title: "Professional UI refresh",
      icon: LayoutDashboard,
      items: ["Desktop dropdown navigation", "Flatter public page system", "Improved loading skeletons", "Cleaner dashboard header"],
    },
    {
      version: "2026.03",
      title: "Mobile inbox polish",
      icon: Smartphone,
      items: ["Bottom tab navigation", "Mobile drawer improvements", "Swipe actions", "Better PWA install prompts"],
    },
    {
      version: "2026.02",
      title: "Developer access",
      icon: Code2,
      items: ["OAuth app management", "Scoped permissions", "Consent screen", "Developer documentation updates"],
    },
  ];

  return (
    <PageLayout title="Changelog">
      <section className="pb-10">
        <h1 className="mb-3 text-3xl font-black tracking-tight md:text-5xl">What is new in AfuChat Mail.</h1>
        <p className="max-w-2xl text-lg font-medium leading-8 text-muted-foreground">
          Product updates, design improvements, mobile refinements, and developer platform changes.
        </p>
      </section>

      <section className="space-y-5">
        {releases.map((release, index) => (
          <article key={release.version} className="rounded-3xl bg-background p-6 shadow-xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  <release.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {release.version}
                  </p>
                  <h2 className="mt-1 text-2xl font-black" data-testid={`text-release-title-${index}`}>{release.title}</h2>
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {release.items.map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm font-bold">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  {item}
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </PageLayout>
  );
};

export default Changelog;