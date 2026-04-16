import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const hasSeenPrompt = localStorage.getItem("pwa-install-prompt-seen");
    const isInstalled = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    if (hasSeenPrompt || isInstalled) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 3000);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = (window.navigator as any).standalone;
    if (isIOS && !isInStandaloneMode && !hasSeenPrompt) {
      setTimeout(() => setShowPrompt(true), 3000);
    }
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) alert("To install this app on iOS:\n1. Tap the Share button\n2. Scroll down and tap 'Add to Home Screen'\n3. Tap 'Add'");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") console.log("User accepted the install prompt");
    setDeferredPrompt(null);
    setShowPrompt(false);
    localStorage.setItem("pwa-install-prompt-seen", "true");
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-prompt-seen", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-card rounded-2xl shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
            <Download className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-sm">Install AfuChat</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6 -mt-0.5 rounded-lg" onClick={handleDismiss}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              Get a faster experience with offline access and notifications
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 rounded-xl text-xs font-semibold" onClick={handleDismiss}>
                Not now
              </Button>
              <Button size="sm" className="flex-1 rounded-xl text-xs font-semibold shadow-sm" onClick={handleInstall}>
                Install
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
