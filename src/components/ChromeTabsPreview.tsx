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
    <div className="w-full border-b border-border bg-muted/40">
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
                  "relative flex items-center gap-2.5 px-4 py-2.5 flex-shrink-0",
                  "min-w-[160px] w-[220px] max-w-[240px]",
                  "transition-all duration-150 cursor-pointer",
                  "before:absolute before:bottom-0 before:left-[-8px] before:w-2 before:h-2",
                  "after:absolute after:bottom-0 after:right-[-8px] after:w-2 after:h-2",
                  isActive
                    ? "bg-background shadow-sm z-10 before:bg-background after:bg-background before:rounded-br-lg after:rounded-bl-lg"
                    : "bg-transparent hover:bg-muted/30"
                )}
                style={{
                  borderTopLeftRadius: "8px",
                  borderTopRightRadius: "8px",
                  clipPath: isActive 
                    ? "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)"
                    : undefined
                }}
              >
              {/* Corner curves for active tab */}
              {isActive && (
                <>
                  <div className="absolute bottom-0 left-[-8px] w-2 h-2">
                    <div className="absolute bottom-0 right-0 w-2 h-2 bg-muted/40 rounded-br-lg" />
                  </div>
                  <div className="absolute bottom-0 right-[-8px] w-2 h-2">
                    <div className="absolute bottom-0 left-0 w-2 h-2 bg-muted/40 rounded-bl-lg" />
                  </div>
                </>
              )}
              
              {/* Favicon */}
              <img
                src={tab.favicon}
                alt=""
                className="w-4 h-4 flex-shrink-0 rounded-sm relative z-10"
                onError={(e) => {
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z'/%3E%3C/svg%3E";
                }}
              />
              
              {/* Title */}
              <span
                className={cn(
                  "flex-1 truncate text-sm transition-colors font-normal relative z-10",
                  isActive ? "text-foreground" : "text-muted-foreground/70"
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
