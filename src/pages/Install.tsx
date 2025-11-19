import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Smartphone, Check } from "lucide-react";
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
    // Check if already installed
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 space-y-6 bg-slate-900/50 backdrop-blur border-slate-800">
        <div className="text-center space-y-4">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center">
            <Smartphone className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-white">Install AfuChat Mail</h1>
          
          {isInstalled ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-green-500">
                <Check className="w-5 h-5" />
                <p className="text-lg">App is installed!</p>
              </div>
              <Button 
                onClick={() => navigate("/dashboard")} 
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-300">
                Install AfuChat Mail on your device for the best experience. Works offline and feels like a native app!
              </p>

              {deferredPrompt ? (
                <Button 
                  onClick={handleInstall}
                  className="w-full gap-2"
                  size="lg"
                >
                  <Download className="w-5 h-5" />
                  Install App
                </Button>
              ) : (
                <div className="space-y-3 text-sm text-slate-400">
                  <p className="font-semibold text-slate-300">To install manually:</p>
                  <div className="space-y-2 text-left">
                    <div className="flex gap-2">
                      <span className="font-bold text-cyan-400">iPhone:</span>
                      <span>Tap Share → Add to Home Screen</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold text-cyan-400">Android:</span>
                      <span>Tap Menu → Install App</span>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                variant="outline" 
                onClick={() => navigate("/")}
                className="w-full"
              >
                Continue in Browser
              </Button>
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-slate-800 space-y-3">
          <h3 className="font-semibold text-white text-center">Features</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-cyan-400" />
              Works offline
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-cyan-400" />
              Fast loading
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-cyan-400" />
              Native app experience
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-cyan-400" />
              Real-time email updates
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
