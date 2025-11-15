import { cn } from "@/lib/utils";
import { Tab } from "./TabSwitcher";

interface TabItemProps {
  tab: Tab;
  isSelected: boolean;
  onClick: () => void;
}

export const TabItem = ({ tab, isSelected, onClick }: TabItemProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg",
        "transition-colors",
        "text-left group",
        isSelected
          ? "bg-[hsl(var(--switcher-item-selected))]/10 ring-1 ring-[hsl(var(--switcher-item-selected))]/30"
          : "hover:bg-[hsl(var(--switcher-item-hover))]"
      )}
    >
      {/* Favicon */}
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {tab.favicon ? (
          <img
            src={tab.favicon}
            alt=""
            className="w-4 h-4 object-contain"
            onError={(e) => {
              // Fallback if favicon fails to load
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="w-4 h-4 rounded bg-muted" />
        )}
      </div>

      {/* Title and URL */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">
          {tab.title || "Untitled"}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {tab.url}
        </div>
      </div>
    </button>
  );
};
