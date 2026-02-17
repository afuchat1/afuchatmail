import { useState, useEffect } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Download, Smartphone, Check, Monitor, Apple, Chrome } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) setIsInstalled(true);
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") { setIsInstalled(true); setDeferredPrompt(null); }
  };

  const features = ["Works offline", "Fast loading", "Native experience", "Push notifications", "Home screen icon", "Auto updates"];

  const platforms = [
    { icon: Apple, name: "iPhone / iPad", steps: ["Open in Safari", "Tap Share button", "'Add to Home Screen'"] },
    { icon: Chrome, name: "Android", steps: ["Open in Chrome", "Tap Menu (⋮)", "'Install App'"] },
    { icon: Monitor, name: "Desktop", steps: ["Open in Chrome/Edge", "Click install icon in address bar", "Or use the button below"] },
  ];

  return (
    <PageLayout>
      <section className="pt-12 pb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Install</h1>
        <p className="text-muted-foreground">Get the native app experience on any device.</p>
      </section>

      <section className="pb-8 text-center">
        <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-6">
          <Smartphone className="w-8 h-8 text-primary-foreground" />
        </div>

        {isInstalled ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Check className="w-5 h-5" />
              <p className="font-medium">App installed!</p>
            </div>
            <Button onClick={() => navigate("/dashboard")} className="w-full max-w-xs h-12 rounded-lg">
              Go to Dashboard
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Offline access, push notifications, home screen icon.</p>
            {deferredPrompt ? (
              <Button onClick={handleInstall} className="w-full max-w-xs h-12 rounded-lg" size="lg">
                <Download className="w-4 h-4 mr-2" />
                Install App
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">See instructions below for your device.</p>
            )}
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="w-full max-w-xs">
              Continue in Browser
            </Button>
          </div>
        )}
      </section>

      <div className="border-t" />

      <section className="py-8">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Features</h2>
        <div className="grid grid-cols-2 gap-2">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Check className="w-3.5 h-3.5 text-primary" />
              <span className="text-muted-foreground">{f}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t" />

      <section className="py-8">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-6">How to install</h2>
        <div className="space-y-6">
          {platforms.map((p, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-2">
                <p.icon className="h-4 w-4 text-foreground" />
                <h3 className="font-semibold text-sm">{p.name}</h3>
              </div>
              <ol className="space-y-1 text-sm text-muted-foreground ml-6">
                {p.steps.map((step, idx) => (
                  <li key={idx}>{idx + 1}. {step}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </PageLayout>
  );
}
