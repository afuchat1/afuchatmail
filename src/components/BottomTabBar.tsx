import { Mail, Search, Settings, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabId = "mail" | "search" | "settings";

interface BottomTabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  unreadCount?: number;
}

export const BottomTabBar = ({ activeTab, onTabChange, unreadCount = 0 }: BottomTabBarProps) => {
  const tabs: { id: TabId; label: string; icon: typeof Mail }[] = [
    { id: "mail", label: "Mail", icon: Mail },
    { id: "search", label: "Search", icon: Search },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border shadow-[0_-1px_3px_0_hsl(220_20%_10%/0.05)] safe-area-bottom">
      <div className="flex items-stretch max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2 pt-2.5 transition-all duration-200 relative touch-active",
                isActive ? "text-primary" : "text-muted-foreground active:text-foreground"
              )}
            >
              <div className="relative">
                {isActive && (
                  <div className="absolute -inset-x-3 -inset-y-1 bg-accent rounded-full" />
                )}
                <Icon className={cn("h-[22px] w-[22px] relative", isActive && "stroke-[2.5]")} />
                {tab.id === "mail" && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-3 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[11px] relative",
                isActive ? "font-bold" : "font-semibold"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
