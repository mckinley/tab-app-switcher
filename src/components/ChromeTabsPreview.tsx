import { Tab } from "./TabSwitcher";
import { cn } from "@/lib/utils";

interface ChromeTabsPreviewProps {
  tabs: Tab[];
  activeTabId: string;
  isVisible: boolean;
  onTabClick: (tabId: string) => void;
}

export const ChromeTabsPreview = ({ tabs, activeTabId, isVisible, onTabClick }: ChromeTabsPreviewProps) => {
  return (
    <div className="w-full border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-0 overflow-x-auto scrollbar-hide">
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
          {tabs.map((tab) => {
            const isActive = !isVisible && tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                onClick={() => onTabClick(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 flex-shrink-0",
                  "min-w-[120px] w-auto max-w-[240px] flex-1",
                  "transition-all duration-150",
                  "border-b-2 border-r border-border/10",
                  isActive
                    ? "border-b-foreground text-foreground"
                    : "border-b-transparent text-muted-foreground hover:text-foreground hover:border-b-muted-foreground/30"
                )}
              >
                {/* Favicon */}
                <img
                  src={tab.favicon}
                  alt=""
                  className="w-[18px] h-[18px] flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z'/%3E%3C/svg%3E";
                  }}
                />
                
                {/* Title */}
                <span className="flex-1 truncate text-sm text-left">
                  {tab.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
