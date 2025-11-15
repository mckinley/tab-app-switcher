import { cn } from "@/lib/utils";
import { Tab } from "./TabSwitcher";

interface TabItemProps {
  tab: Tab;
  isSelected: boolean;
  shortcutNumber?: number;
  onClick: () => void;
}

export const TabItem = ({ tab, isSelected, shortcutNumber, onClick }: TabItemProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg",
        "transition-all duration-150",
        "text-left group",
        isSelected
          ? "bg-[hsl(var(--switcher-item-selected))]/10 border border-[hsl(var(--switcher-item-selected))]/30 shadow-sm"
          : "bg-[hsl(var(--switcher-item))] border border-transparent hover:bg-[hsl(var(--switcher-item-hover))]"
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

      {/* Keyboard shortcut indicator */}
      {shortcutNumber !== undefined && (
        <div
          className={cn(
            "flex-shrink-0 w-6 h-6 flex items-center justify-center rounded",
            "text-xs font-mono",
            "transition-colors duration-150",
            isSelected
              ? "bg-[hsl(var(--switcher-item-selected))] text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {shortcutNumber}
        </div>
      )}
    </button>
  );
};
