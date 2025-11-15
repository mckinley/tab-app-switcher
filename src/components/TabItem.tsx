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
        "w-full flex items-center gap-4 px-4 py-3 rounded-xl",
        "transition-all duration-200",
        "text-left group",
        isSelected
          ? "bg-[hsl(var(--switcher-item-selected))]/15 ring-1 ring-[hsl(var(--switcher-item-selected))]/40"
          : "hover:bg-[hsl(var(--switcher-item-hover))]"
      )}
    >
      {/* Favicon */}
      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
        {tab.favicon ? (
          <img
            src={tab.favicon}
            alt=""
            className="w-5 h-5 object-contain"
            onError={(e) => {
              // Fallback if favicon fails to load
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="w-5 h-5 rounded bg-muted" />
        )}
      </div>

      {/* Title and URL */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate mb-0.5">
          {tab.title || "Untitled"}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {tab.url}
        </div>
      </div>
    </button>
  );
};
