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
  mruOrder: string[];
  clickedTabs: Set<string>;
}

export const ChromeTabsPreview = ({ tabs, activeTabId, isVisible, onTabClick, onCloseTab, onAddTab, canAddTab, mruOrder, clickedTabs }: ChromeTabsPreviewProps) => {
  return (
    <div className="w-full border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 relative">
        {tabs.length === 0 ? (
          /* Empty State */
          <div className="flex items-center justify-center py-3 text-muted-foreground text-sm">
            <span className="mr-2">No tabs open</span>
            {canAddTab && (
              <button
                onClick={onAddTab}
                className="px-3 py-1 rounded-md border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-xs"
              >
                + Add Tab
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            <div className="flex gap-0 overflow-x-auto scrollbar-hide pb-6" style={{ paddingRight: canAddTab ? '48px' : '0' }}>
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
                const mruPosition = mruOrder.indexOf(tab.id) + 1;
                const showBadge = clickedTabs.has(tab.id);
                return (
                  <div key={tab.id} className="relative flex-1 min-w-[120px] max-w-[240px]">
                  <button
                    onClick={() => onTabClick(tab.id)}
                    className={cn(
                      "group relative flex items-center gap-3 px-4 w-full",
                      "h-12",
                      "transition-all duration-150",
                      "border-b-2 border-r border-border/10",
                      isActive
                        ? "border-b-foreground"
                        : "border-b-transparent hover:border-b-muted-foreground/30"
                    )}
                  >
                    <div className="flex items-center gap-3 w-full">
                    {/* Favicon */}
                    <img
                      src={tab.favicon}
                      alt=""
                      className="w-[18px] h-[18px] flex-shrink-0 z-10"
                      onError={(e) => {
                        e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z'/%3E%3C/svg%3E";
                      }}
                    />
                    
                    {/* Title with right fade */}
                    <div className="flex-1 min-w-0 relative">
                      <span 
                        className={cn(
                          "block text-sm text-left overflow-hidden whitespace-nowrap",
                          isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                        )}
                        style={{
                          maskImage: 'linear-gradient(to right, black 0%, black calc(100% - 20px), transparent 100%)',
                          WebkitMaskImage: 'linear-gradient(to right, black 0%, black calc(100% - 20px), transparent 100%)'
                        }}
                      >
                        {tab.title}
                      </span>
                    </div>
                    
                    {/* Close Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseTab(tab.id);
                      }}
                      className="absolute right-1 flex-shrink-0 w-4 h-4 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted transition-all z-20"
                      aria-label="Close tab"
                    >
                      <span className="text-xs text-muted-foreground hover:text-foreground">×</span>
                    </button>
                    </div>
                  </button>
                  
                  {/* MRU Position Badge - Below border */}
                  {showBadge && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-[-28px] flex items-center justify-center animate-scale-in z-50">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                        <span className="text-[10px] font-medium text-primary">
                          {mruPosition}
                        </span>
                      </div>
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
            
            {/* Add Tab Button - Fixed on the right */}
            {canAddTab && (
              <button
                onClick={onAddTab}
                className="absolute right-0 top-0 flex items-center justify-center w-12 h-12 border-b-2 border-l border-border/10 border-b-transparent hover:border-b-muted-foreground/30 hover:bg-background/95 transition-all text-muted-foreground hover:text-foreground bg-background z-30"
                aria-label="Add new tab"
              >
                <span className="text-lg font-light">+</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
