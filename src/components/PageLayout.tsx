import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageLayoutProps {
  title?: string;
  children: React.ReactNode;
}

export const PageLayout = ({ title, children }: PageLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border shadow-xs">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {title && <h1 className="text-lg font-bold">{title}</h1>}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6">
        <div className="prose prose-sm max-w-none text-foreground
          prose-headings:text-foreground prose-headings:font-bold
          prose-p:text-muted-foreground prose-p:leading-relaxed
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-strong:text-foreground
          prose-li:text-muted-foreground">
          {children}
        </div>
      </main>
    </div>
  );
};
