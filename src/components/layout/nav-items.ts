import {
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  Bell,
  Building2,
  Bus,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Calculator,
  CheckSquare,
  ClipboardList,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  Search,
  Settings,
  Sparkles,
  StickyNote,
  Target,
  Timer,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  mobile?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Asosiy",
    items: [
      { href: "/dashboard", label: "Bosh sahifa", icon: LayoutDashboard, mobile: true },
      { href: "/groups", label: "Guruhim", icon: Users },
      { href: "/schedule", label: "Dars jadvali", icon: CalendarDays, mobile: true },
      { href: "/attendance", label: "Davomat", icon: CalendarCheck },
      { href: "/homework", label: "Vazifalar", icon: ClipboardList, mobile: true },
      { href: "/tasks", label: "Todo", icon: CheckSquare, mobile: true },
      { href: "/notes", label: "Eslatmalar", icon: StickyNote },
      { href: "/calendar", label: "Kalendar", icon: CalendarRange },
      { href: "/transport", label: "Transport", icon: Bus },
    ],
  },
  {
    title: "Turar joy",
    items: [{ href: "/housing", label: "Kvartiralar", icon: Building2 }],
  },
  {
    title: "O'qish",
    items: [
      { href: "/ai", label: "AI yordamchi", icon: Sparkles },
      { href: "/learn", label: "Test va kartochkalar", icon: BookOpenCheck },
      { href: "/exams", label: "Imtihonlar", icon: GraduationCap },
      { href: "/study-plans", label: "Tayyorgarlik rejasi", icon: CalendarRange },
      { href: "/opportunities", label: "Imkoniyatlar", icon: BriefcaseBusiness },
      { href: "/goals", label: "Maqsadlar", icon: Target },
      { href: "/focus", label: "Focus rejim", icon: Timer, mobile: true },
      { href: "/analytics", label: "Tahlillar", icon: BarChart3 },
      { href: "/materials", label: "Materiallar", icon: FolderOpen },
      { href: "/gpa", label: "GPA kalkulyator", icon: Calculator },
    ],
  },
  {
    title: "Moliya",
    items: [{ href: "/budget", label: "Budjet", icon: Wallet }],
  },
  {
    title: "Boshqa",
    items: [
      { href: "/notifications", label: "Bildirishnomalar", icon: Bell },
      { href: "/search", label: "Qidiruv", icon: Search },
      { href: "/profile", label: "Profil", icon: User },
      { href: "/settings", label: "Sozlamalar", icon: Settings },
    ],
  },
];

export const MOBILE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Asosiy", icon: LayoutDashboard },
  { href: "/schedule", label: "Jadval", icon: CalendarDays },
  { href: "/homework", label: "Vazifa", icon: ClipboardList },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/tasks", label: "Todo", icon: CheckSquare },
];
