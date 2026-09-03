"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  LayoutDashboard,
  Calendar,
  Settings,
  Bell,
  Menu,
  X,
  LogOut,
  Users,
  CalendarCheck,
  Send,
} from "lucide-react";

const BASE_NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

function ProfileInfo() {
  const [name, setName] = useState(() => {
    try {
      const userStr = typeof window !== "undefined" ? sessionStorage.getItem("agentify_current_user") : null;
      if (userStr) {
        const u = JSON.parse(userStr);
        return u.clinic_name || u.institute_name || u.name || "User";
      }
    } catch {}
    return "User";
  });

  useEffect(() => {
    const fetchName = async () => {
      try {
        const userStr = sessionStorage.getItem("agentify_current_user");
        if (!userStr) return;
        const user = JSON.parse(userStr);
        if (user.businessType === "education") {
          const res = await fetch(`/api/education/settings?userId=${user.id}`);
          const data = await res.json();
          if (data.data?.institute_name) setName(data.data.institute_name);
        } else {
          const res = await fetch(`/api/doctor-settings?userId=${user.id}`);
          const data = await res.json();
          if (data.data?.clinic_name) setName(data.data.clinic_name);
        }
      } catch (e) {}
    };
    fetchName();
  }, []);

  return (
    <>
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{name}</p>
        <p className="text-xs text-text-secondary">Free Plan</p>
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [navItems, setNavItems] = useState(BASE_NAV_ITEMS);
  const [isPaused, setIsPaused] = useState(false);
  const checkedPauseRef = useRef(false);

  useEffect(() => {
    if (checkedPauseRef.current) return;
    const userStr = sessionStorage.getItem("agentify_current_user");
    if (!userStr) return;
    try {
      const user = JSON.parse(userStr);
      checkedPauseRef.current = true;
      fetch(`/api/admin/businesses?userId=${encodeURIComponent(user.id)}`)
        .then((r) => r.json())
        .then((d) => { if (d.success) setIsPaused(!!d.paused); })
        .catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    // Auth check via sessionStorage
    const userStr = sessionStorage.getItem("agentify_current_user");
    if (!userStr) {
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (user.businessType === "education") {
        setNavItems([
          { name: "School Hub", href: "/dashboard/education", icon: LayoutDashboard },
          { name: "Students", href: "/dashboard/education?tab=students", icon: Users },
          { name: "Attendance", href: "/dashboard/education?tab=attendance", icon: CalendarCheck },
          { name: "Broadcast", href: "/dashboard/education?tab=broadcast", icon: Send },
        ]);
        // Redirect to school dashboard if on wrong page
        if (pathname === "/dashboard") {
          router.replace("/dashboard/education");
          return;
        }
      } else if (user.businessType === "clinic") {
        setNavItems([
          { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          { name: "Appointments", href: "/dashboard/appointments", icon: Calendar },
        ]);
        // Redirect to clinic dashboard if on school page
        if (pathname === "/dashboard/education") {
          router.replace("/dashboard");
          return;
        }
      } else {
        // No business type set yet — redirect to onboarding
        if (pathname !== "/onboarding") {
          router.replace("/onboarding");
          return;
        }
      }
      setIsLoading(false);
    } catch {
      router.replace("/login");
    }
  }, [router, pathname]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    sessionStorage.removeItem("agentify_current_user");
    toast.success("Logged out successfully");
    router.replace("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm font-black">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-64 border-r border-border bg-card flex flex-col fixed h-full z-40 transition-transform duration-300 md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
            <span className="text-2xl">🤖</span>
            <span className="text-xl font-bold font-sans">Agentify</span>
          </Link>
          <button className="md:hidden p-2" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = item.href.includes('?')
              ? pathname + (typeof window !== 'undefined' ? window.location.search : '') === item.href
              : pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:text-foreground hover:bg-background"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-text-secondary"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border mt-auto space-y-4">
          <div className="flex items-center gap-3">
            <ProfileInfo />
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-20 px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              className="md:hidden p-2 -ml-2 text-text-secondary hover:text-foreground transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold hidden sm:block">
              {navItems.find((n) => n.href === pathname)?.name || "Dashboard"}
            </h1>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Agent Active
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <h1 className="text-lg font-bold sm:hidden">
              {navItems.find((n) => n.href === pathname)?.name || "Dashboard"}
            </h1>
            <button className="p-2 text-text-secondary hover:text-foreground transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </button>
          </div>
        </header>

        {/* Paused banner */}
        {isPaused && (
          <div className="px-4 md:px-6 py-3 bg-amber-500/10 border-b border-amber-500/30 flex items-center gap-3">
            <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <p className="text-sm font-bold text-amber-300">
              Your agent is currently paused
            </p>
          </div>
        )}

        <div className="flex-1 p-4 md:p-6 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
