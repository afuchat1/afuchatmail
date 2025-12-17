import { useState, useEffect } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Smartphone, Check, Monitor, Apple, Chrome } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const features = [
    { icon: Check, text: "Works offline" },
    { icon: Check, text: "Fast loading" },
    { icon: Check, text: "Native app experience" },
    { icon: Check, text: "Push notifications" },
    { icon: Check, text: "Home screen icon" },
    { icon: Check, text: "Automatic updates" }
  ];

  const platforms = [
    {
      icon: Apple,
      name: "iPhone / iPad",
      steps: ["Open in Safari", "Tap Share button", "Select 'Add to Home Screen'"]
    },
    {
      icon: Chrome,
      name: "Android",
      steps: ["Open in Chrome", "Tap Menu (⋮)", "Select 'Install App'"]
    },
    {
      icon: Monitor,
      name: "Desktop",
      steps: ["Open in Chrome/Edge", "Click install icon in address bar", "Or use the button below"]
    }
  ];

  return (
    <PageLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="container mx-auto px-4 pt-16 pb-12 relative">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-4">Install</Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="bg-gradient-primary bg-clip-text text-transparent">Install AfuChat Mail</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Get the native app experience on any device
            </p>
          </div>
        </div>
      </section>

      {/* Install Card */}
      <section className="container mx-auto px-4 py-8">
        <Card className="max-w-lg mx-auto border-2 border-primary/20">
          <CardContent className="pt-8 pb-6 text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <Smartphone className="w-10 h-10 text-primary-foreground" />
            </div>
            
            {isInstalled ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                  <Check className="w-5 h-5" />
                  <p className="text-lg font-medium">App is installed!</p>
                </div>
                <Button onClick={() => navigate("/dashboard")} className="w-full">
                  Go to Dashboard
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Install AfuChat Mail for the best experience with offline access and push notifications
                </p>

                {deferredPrompt ? (
                  <Button onClick={handleInstall} className="w-full h-12 gap-2" size="lg">
                    <Download className="w-5 h-5" />
                    Install App
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Use the instructions below for your device
                  </p>
                )}

                <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-full">
                  Continue in Browser
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          <h3 className="font-semibold text-center mb-4">App Features</h3>
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <feature.icon className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Instructions */}
      <section className="bg-muted/30 border-y">
        <div className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-center mb-8">Installation Instructions</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {platforms.map((platform, index) => (
              <Card key={index} className="border-2">
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <platform.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">{platform.name}</h3>
                  </div>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    {platform.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-medium text-primary">{idx + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}