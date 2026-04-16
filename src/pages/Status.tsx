import { Activity, CheckCircle, Clock, Mail, Shield, Smartphone } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";

const Status = () => {
  const systems = [
    { name: "Web application", status: "Operational", icon: Activity },
    { name: "Mail delivery", status: "Operational", icon: Mail },
    { name: "Authentication", status: "Operational", icon: Shield },
    { name: "Mobile PWA", status: "Operational", icon: Smartphone },
  ];

  const incidents = [
    { date: "Apr 2026", title: "No active incidents", description: "All monitored systems are currently operating normally." },
    { date: "Mar 2026", title: "Developer portal maintenance", description: "Planned maintenance completed with no customer-facing data loss." },
    { date: "Feb 2026", title: "Notification tuning", description: "Push delivery configuration was adjusted to improve mobile reliability." },
  ];

  return (
    <PageLayout title="Status">
      <section className="pb-10">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-xs font-black text-primary">
          <CheckCircle className="h-3.5 w-3.5" />
          All systems operational
        </div>
        <h1 className="mb-3 text-3xl font-black tracking-tight md:text-5xl">AfuChat Mail system status.</h1>
        <p className="max-w-2xl text-lg font-medium leading-8 text-muted-foreground">
          Public service health for the app, authentication, mail experience, and mobile workspace.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {systems.map((system, index) => (
          <article key={system.name} className="flex items-center justify-between rounded-2xl bg-background p-5 shadow-xs">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <system.icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-black" data-testid={`text-status-system-${index}`}>{system.name}</h2>
                <p className="text-xs font-bold text-muted-foreground">Live monitoring</p>
              </div>
            </div>
            <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-black text-green-600 dark:text-green-400">
              {system.status}
            </span>
          </article>
        ))}
      </section>

      <section className="mt-10 rounded-3xl bg-background p-6">
        <p className="text-xs font-black uppercase tracking-wider text-primary">Incident history</p>
        <div className="mt-5 space-y-4">
          {incidents.map((incident, index) => (
            <div key={incident.title} className="flex gap-4 rounded-2xl bg-card p-4">
              <div className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">{incident.date}</p>
                <h2 className="mt-1 font-black" data-testid={`text-incident-${index}`}>{incident.title}</h2>
                <p className="mt-1 text-sm font-medium leading-6 text-muted-foreground">{incident.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageLayout>
  );
};

export default Status;