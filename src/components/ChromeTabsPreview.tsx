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
    <div className="w-full border-b border-border bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 pt-2">
        <div className="flex gap-0.5 overflow-x-auto scrollbar-hide">
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
              <div
                key={tab.id}
                onClick={() => onTabClick(tab.id)}
                className={cn(
                  "relative flex items-center gap-2.5 px-4 py-2 rounded-t-lg flex-shrink-0",
                  "min-w-[160px] w-[220px] max-w-[240px]",
                  "transition-all duration-150 cursor-pointer",
                  isActive
                    ? "bg-background shadow-sm z-10"
                    : "bg-muted/50 hover:bg-muted/70"
                )}
                style={{
                  borderTopLeftRadius: "8px",
                  borderTopRightRadius: "8px",
                }}
              >
              {/* Favicon */}
              <img
                src={tab.favicon}
                alt=""
                className="w-4 h-4 flex-shrink-0 rounded-sm"
                onError={(e) => {
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z'/%3E%3C/svg%3E";
                }}
              />
              
              {/* Title */}
              <span
                className={cn(
                  "flex-1 truncate text-sm transition-colors font-normal",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {tab.title}
              </span>

              {/* Active tab bottom border */}
              {isActive && (
                <div className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-background z-20" />
              )}
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
