import { Search } from "lucide-react";

import { Input } from "@/components/primitives/Input";
import { cn } from "@/lib/cn";

import "./SearchBar.css";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder, className }: SearchBarProps) {
  return (
    <div className={cn("cn-search-bar", className)}>
      <span className="cn-search-bar__icon">
        <Search size={16} />
      </span>
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
