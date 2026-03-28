import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
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
  labelKey: string;
}

const topItems: NavItem[] = [
  { icon: LayoutDashboard, path: '/app/dashboard', labelKey: 'nav.dashboard' },
  { icon: Folder, path: '/app/files', labelKey: 'nav.files' },
  { icon: BarChart2, path: '/app/analytics', labelKey: 'nav.analytics' },
  { icon: Calendar, path: '/app/calendar', labelKey: 'nav.calendar' },
];

const bottomSecondary: NavItem[] = [
  { icon: User, path: '/app/characters', labelKey: 'nav.characters' },
  { icon: Network, path: '/app/knowledge-graph', labelKey: 'nav.knowledgeGraph' },
];

const settingsItem: NavItem = {
  icon: Settings,
  path: '/settings',
  labelKey: 'nav.settings',
};

function NavButton({ item, active, t }: { item: NavItem; active: boolean; t: (key: string) => string }) {
  const navigate = useNavigate();
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => navigate(item.path)}
      aria-current={active ? 'page' : undefined}
      aria-label={t(item.labelKey)}
      className={cn(
        'flex items-center justify-center w-9 h-9 rounded-md',
        'transition-colors duration-fast ease-out',
        active
          ? 'text-accent bg-accent-subtle'
          : 'text-muted-foreground hover:text-foreground hover:bg-hover-overlay',
      )}
    >
      <Icon size={18} strokeWidth={1.5} />
    </button>
  );
}

export function IconRail() {
  const location = useLocation();
  const { t } = useTranslation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav
      role="navigation"
      className="flex flex-col items-center w-12 bg-sidebar border-r border-border py-2 gap-1"
    >
      {/* Search button — no route, will open CommandPalette */}
      <button
        type="button"
        aria-label={t('nav.search')}
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-md',
          'transition-colors duration-fast ease-out',
          'text-muted-foreground hover:text-foreground hover:bg-hover-overlay',
        )}
      >
        <Search size={18} strokeWidth={1.5} />
      </button>

      {topItems.map((item) => (
        <NavButton key={item.path} item={item} active={isActive(item.path)} t={t} />
      ))}

      <Separator className="my-1 w-6" />

      {bottomSecondary.map((item) => (
        <NavButton key={item.path} item={item} active={isActive(item.path)} t={t} />
      ))}

      <div className="flex-1" />

      <NavButton item={settingsItem} active={isActive(settingsItem.path)} t={t} />
    </nav>
  );
}
