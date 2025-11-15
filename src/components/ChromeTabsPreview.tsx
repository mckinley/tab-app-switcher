import { Tab } from "./TabSwitcher";
import { cn } from "@/lib/utils";

interface ChromeTabsPreviewProps {
  tabs: Tab[];
  activeTabId: string;
  isVisible: boolean;
  onTabClick: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onAddTab: () => void;
  canAddTab: boolean;
}

export const ChromeTabsPreview = ({ tabs, activeTabId, isVisible, onTabClick, onCloseTab, onAddTab, canAddTab }: ChromeTabsPreviewProps) => {
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
              <div
                key={tab.id}
                className={cn(
                  "group relative flex items-center gap-3 px-4 py-3 flex-shrink-0",
                  "min-w-[120px] w-auto max-w-[240px] flex-1",
                  "transition-all duration-150",
                  "border-b-2 border-r border-border/10",
                  isActive
                    ? "border-b-foreground"
                    : "border-b-transparent hover:border-b-muted-foreground/30"
                )}
              >
                <button
                  onClick={() => onTabClick(tab.id)}
                  className="flex items-center gap-3 flex-1 min-w-0"
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
                  <span className={cn(
                    "flex-1 truncate text-sm text-left",
                    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {tab.title}
                  </span>
                </button>
                
                {/* Close Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="flex-shrink-0 w-4 h-4 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                  aria-label="Close tab"
                >
                  <span className="text-xs text-muted-foreground hover:text-foreground">×</span>
                </button>
              </div>
            );
          })}
          
          {/* Add Tab Button */}
          {canAddTab && (
            <button
              onClick={onAddTab}
              className="flex items-center justify-center px-4 py-3 flex-shrink-0 w-12 border-b-2 border-r border-border/10 border-b-transparent hover:border-b-muted-foreground/30 hover:bg-muted/50 transition-all text-muted-foreground hover:text-foreground"
              aria-label="Add new tab"
            >
              <span className="text-lg font-light">+</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
