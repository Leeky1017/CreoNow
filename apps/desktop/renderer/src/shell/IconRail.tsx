import { useLocation, useNavigate } from 'react-router';
import {
  Search,
  LayoutDashboard,
  Folder,
  BarChart2,
  Calendar,
  User,
  Network,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { Separator } from '@/components/primitives';
import { cn } from '@/lib/cn';

interface NavItem {
  icon: LucideIcon;
  path: string;
  label: string;
}

const topItems: NavItem[] = [
  { icon: Search, path: '/app/search', label: 'Search' },
  { icon: LayoutDashboard, path: '/app/dashboard', label: 'Dashboard' },
  { icon: Folder, path: '/app/files', label: 'Files' },
  { icon: BarChart2, path: '/app/analytics', label: 'Analytics' },
  { icon: Calendar, path: '/app/calendar', label: 'Calendar' },
];

const bottomSecondary: NavItem[] = [
  { icon: User, path: '/app/characters', label: 'Characters' },
  { icon: Network, path: '/app/knowledge-graph', label: 'Knowledge Graph' },
];

const settingsItem: NavItem = {
  icon: Settings,
  path: '/settings',
  label: 'Settings',
};

function NavButton({ item, active }: { item: NavItem; active: boolean }) {
  const navigate = useNavigate();
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => navigate(item.path)}
      aria-current={active ? 'page' : undefined}
      aria-label={item.label}
      className={cn(
        'flex items-center justify-center w-9 h-9 rounded-md',
        'transition-colors duration-fast ease-out',
        active
          ? 'text-accent bg-accent-subtle'
          : 'text-muted-foreground hover:text-foreground hover:bg-[rgba(255,255,255,0.06)]',
      )}
    >
      <Icon size={18} strokeWidth={1.5} />
    </button>
  );
}

export function IconRail() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav
      role="navigation"
      className="flex flex-col items-center w-12 bg-sidebar border-r border-border py-2 gap-1"
    >
      {topItems.map((item) => (
        <NavButton key={item.path} item={item} active={isActive(item.path)} />
      ))}

      <Separator className="my-1 w-6" />

      {bottomSecondary.map((item) => (
        <NavButton key={item.path} item={item} active={isActive(item.path)} />
      ))}

      <div className="flex-1" />

      <NavButton item={settingsItem} active={isActive(settingsItem.path)} />
    </nav>
  );
}
