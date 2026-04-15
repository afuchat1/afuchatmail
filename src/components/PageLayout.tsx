import { SiteHeader } from "@/components/SiteHeader";

interface PageLayoutProps {
  title?: string;
  children: React.ReactNode;
}

export const PageLayout = ({ title, children }: PageLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-xs sm:p-8 lg:p-10">
          {title && (
            <div className="mb-6 inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-black uppercase tracking-wider text-muted-foreground">
              {title}
            </div>
          )}
          <div className="prose prose-sm max-w-none text-foreground
          prose-headings:text-foreground prose-headings:font-bold
          prose-p:text-muted-foreground prose-p:leading-relaxed
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-strong:text-foreground
          prose-li:text-muted-foreground">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};