import * as React from "react";
import {
  Search,
  LayoutDashboard,
  Folder,
  BarChart2,
  Calendar,
  User,
  Network,
  Settings,
} from "lucide-react";
import { IconButton } from "../primitives/icon-button";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const topItems: NavItem[] = [
  { id: "search", label: "Search", icon: <Search size={18} /> },
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { id: "files", label: "Files", icon: <Folder size={18} /> },
  { id: "analytics", label: "Analytics", icon: <BarChart2 size={18} /> },
  { id: "calendar", label: "Calendar", icon: <Calendar size={18} /> },
];

const bottomItems: NavItem[] = [
  { id: "profile", label: "Profile", icon: <User size={18} /> },
  { id: "network", label: "Network", icon: <Network size={18} /> },
];

const settingsItem: NavItem = {
  id: "settings",
  label: "Settings",
  icon: <Settings size={18} />,
};

export interface IconRailProps {
  activeItem: string;
  onItemSelect: (id: string) => void;
}

function IconRail({ activeItem, onItemSelect }: IconRailProps) {
  const handleClick = (id: string) => {
    if (id !== activeItem) {
      onItemSelect(id);
    }
  };

  const renderItem = (item: NavItem) => (
    <IconButton
      key={item.id}
      icon={item.icon}
      label={item.label}
      selected={item.id === activeItem}
      onClick={() => handleClick(item.id)}
    />
  );

  return (
    <nav className="flex flex-col items-center w-12 h-full bg-[var(--sidebar)] py-2 gap-1.5">
      {topItems.map(renderItem)}

      <div className="w-6 h-px bg-[var(--border)] my-1" />

      {bottomItems.map(renderItem)}

      <div className="flex-1" />

      {renderItem(settingsItem)}
    </nav>
  );
}

export { IconRail };
