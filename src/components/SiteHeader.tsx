import { Link, useNavigate } from "react-router-dom";
import { Activity, Building2, Code2, FileClock, FileText, LifeBuoy, Lock, Menu, Shield, Sparkles, Tags, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const LogoIcon = () => (
  <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#0052ff"/>
    <rect x="9" y="14" width="22" height="14" rx="1.5" stroke="white" strokeWidth="1.5" fill="none"/>
    <path d="M9 14l11 9 11-9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const navGroups = [
  {
    label: "Platform",
    items: [
      { label: "Features", description: "Professional mail tools", path: "/features", icon: Sparkles },
      { label: "Solutions", description: "Use cases and workflows", path: "/solutions", icon: Users },
      { label: "Pricing", description: "Plans and future upgrades", path: "/pricing", icon: Tags },
      { label: "Security", description: "Privacy and protection", path: "/security", icon: Shield },
    ],
  },
  {
    label: "Developers",
    items: [
      { label: "Documentation", description: "API reference and guides", path: "/docs", icon: FileText },
      { label: "Developer Console", description: "OAuth apps and API keys", path: "/developers", icon: Code2 },
    ],
  },
  {
    label: "Docs",
    items: [
      { label: "About", description: "Mission and values", path: "/about", icon: Building2 },
      { label: "Contact", description: "Support and inquiries", path: "/contact", icon: LifeBuoy },
      { label: "Help Center", description: "Guides and support", path: "/help", icon: LifeBuoy },
      { label: "Status", description: "System availability", path: "/status", icon: Activity },
      { label: "Changelog", description: "Product updates", path: "/changelog", icon: FileClock },
      { label: "Privacy", description: "How data is handled", path: "/privacy", icon: Lock },
      { label: "Terms", description: "Service policies", path: "/terms", icon: FileText },
    ],
  },
];

export function SiteHeader() {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-[#0a0a0a]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" data-testid="link-home">
          <LogoIcon />
          <span className="text-sm font-semibold text-white tracking-tight">AfuChat Mail</span>
        </Link>

        <nav className="hidden items-center gap-0 lg:flex" aria-label="Primary navigation">
          <NavigationMenu>
            <NavigationMenuList className="gap-0">
              {navGroups.map((group) => (
                <NavigationMenuItem key={group.label}>
                  <NavigationMenuTrigger
                    className="h-9 rounded bg-transparent px-3 text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white data-[state=open]:bg-white/8 data-[state=open]:text-white"
                    data-testid={`button-nav-${group.label.toLowerCase()}`}
                  >
                    {group.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="rounded bg-white p-1">
                    <div className="w-64">
                      <p className="px-3 pt-2.5 pb-1.5 text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">
                        {group.label}
                      </p>
                      {group.items.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className="flex items-center gap-2.5 rounded px-3 py-2 hover:bg-neutral-50 transition-colors"
                          data-testid={`link-nav-${item.label.toLowerCase()}`}
                        >
                          <item.icon className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                          <span>
                            <span className="block text-sm font-medium text-neutral-900">{item.label}</span>
                            <span className="block text-xs text-neutral-400">{item.description}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded px-4 text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white"
            onClick={() => navigate("/auth")}
            data-testid="button-sign-in"
          >
            Sign in
          </Button>
          <Button
            size="sm"
            className="h-9 rounded px-4 text-sm font-semibold bg-white text-[#0a0a0a] hover:bg-white/90 shadow-none"
            onClick={() => navigate("/auth")}
            data-testid="button-get-started"
          >
            Get started
          </Button>
        </div>

        <div className="flex items-center md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded text-white hover:bg-white/10" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm p-0 bg-[#0a0a0a] flex flex-col">
              <div className="p-5 pb-4 shrink-0 border-b border-white/5">
                <SheetTitle className="flex items-center gap-2.5 text-sm font-semibold text-white">
                  <LogoIcon />
                  AfuChat Mail
                </SheetTitle>
                <SheetDescription className="mt-1 text-xs text-white/40">
                  Professional email platform
                </SheetDescription>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain thin-scrollbar px-5 py-5 space-y-5">
                {navGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">{group.label}</p>
                    <div className="space-y-0.5">
                      {group.items.map((item) => (
                        <SheetClose asChild key={item.path}>
                          <Link
                            to={item.path}
                            className="flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white"
                            data-testid={`link-mobile-${item.label.toLowerCase()}`}
                          >
                            <item.icon className="h-4 w-4 text-white/30" />
                            {item.label}
                          </Link>
                        </SheetClose>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="shrink-0 grid gap-2 px-5 py-4 border-t border-white/5 pb-[max(env(safe-area-inset-bottom),1rem)]">
                <SheetClose asChild>
                  <Button variant="outline" className="h-10 rounded font-medium border-white/20 text-white bg-transparent hover:bg-white/10" onClick={() => navigate("/auth")}>
                    Sign in
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button className="h-10 rounded font-medium bg-white text-[#0a0a0a] hover:bg-white/90 shadow-none" onClick={() => navigate("/auth")}>
                    Get started
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
