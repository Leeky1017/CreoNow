import * as React from "react";
import { IconRail } from "../composites/icon-rail";

export interface ShellProps {
  children?: React.ReactNode;
}

function Shell({ children }: ShellProps) {
  const [activeItem, setActiveItem] = React.useState("files");

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <IconRail activeItem={activeItem} onItemSelect={setActiveItem} />
      <main className="flex-1 overflow-auto bg-[var(--background)]">
        {children}
      </main>
    </div>
  );
}

export { Shell };
