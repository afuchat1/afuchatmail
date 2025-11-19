import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the prompt
    const hasSeenPrompt = localStorage.getItem("pwa-install-prompt-seen");
    
    // Check if already installed
    const isInstalled = window.matchMedia("(display-mode: standalone)").matches ||
                        (window.navigator as any).standalone === true;

    if (hasSeenPrompt || isInstalled) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a short delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // For iOS devices (which don't support beforeinstallprompt)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = (window.navigator as any).standalone;
    
    if (isIOS && !isInStandaloneMode && !hasSeenPrompt) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // For iOS, show instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert("To install this app on iOS:\n1. Tap the Share button\n2. Scroll down and tap 'Add to Home Screen'\n3. Tap 'Add'");
      }
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
    localStorage.setItem("pwa-install-prompt-seen", "true");
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-prompt-seen", "true");
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-in slide-in-from-bottom-5">
      <Card className="shadow-lg border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Install AfuChat Email</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Install our app for a faster, better experience with offline access and notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2 pb-4">
          <Button variant="outline" onClick={handleDismiss} className="flex-1">
            Not now
          </Button>
          <Button onClick={handleInstall} className="flex-1">
            Install
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};