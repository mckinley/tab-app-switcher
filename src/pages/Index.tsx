import { useState, useEffect } from "react";
import { TabSwitcher, Tab } from "@/components/TabSwitcher";
import { ChromeTabsPreview } from "@/components/ChromeTabsPreview";
import { Button } from "@/components/ui/button";
import { Command, Download, Zap, Search, Keyboard, Clock } from "lucide-react";

// Mock data - in your actual extension, this will come from Chrome API
const mockTabs: Tab[] = [
  {
    id: "1",
    title: "GitHub - Chrome Tab Switcher",
    url: "https://github.com/user/chrome-tab-switcher",
    favicon: "https://github.githubassets.com/favicons/favicon.svg"
  },
  {
    id: "2",
    title: "React Documentation - Getting Started",
    url: "https://react.dev/learn",
    favicon: "https://react.dev/favicon.ico"
  },
  {
    id: "3",
    title: "Stack Overflow - How to build Chrome extension",
    url: "https://stackoverflow.com/questions/12345",
    favicon: "https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico"
  },
  {
    id: "4",
    title: "MDN Web Docs - Chrome Extension APIs",
    url: "https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions",
    favicon: "https://developer.mozilla.org/favicon-48x48.png"
  },
  {
    id: "5",
    title: "Electron Documentation - Quick Start",
    url: "https://www.electronjs.org/docs/latest/",
    favicon: "https://www.electronjs.org/assets/img/favicon.ico"
  },
  {
    id: "6",
    title: "TypeScript Handbook - Advanced Types",
    url: "https://www.typescriptlang.org/docs/handbook/2/types-from-types.html",
    favicon: "https://www.typescriptlang.org/favicon-32x32.png"
  },
  {
    id: "7",
    title: "Tailwind CSS - Utility-First CSS Framework",
    url: "https://tailwindcss.com/docs",
    favicon: "https://tailwindcss.com/favicons/favicon-32x32.png"
  },
  {
    id: "8",
    title: "YouTube - Building Chrome Extensions Tutorial",
    url: "https://www.youtube.com/watch?v=example",
    favicon: "https://www.youtube.com/s/desktop/favicon.ico"
  }
];

const Index = () => {
  const [isSwitcherVisible, setIsSwitcherVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(1);
  const [isAltHeld, setIsAltHeld] = useState(false);

  const handleSelectTab = (tabId: string) => {
    console.log("Selected tab:", tabId);
    setIsSwitcherVisible(false);
    setIsAltHeld(false);
  };

  const handleNavigate = (direction: 'next' | 'prev') => {
    setSelectedIndex(prev => {
      if (direction === 'next') {
        return (prev + 1) % mockTabs.length;
      } else {
        return prev === 0 ? mockTabs.length - 1 : prev - 1;
      }
    });
  };

  // Mac-like Application Switcher behavior with Alt key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Track Alt key press
      if (e.key === "Alt") {
        setIsAltHeld(true);
      }

      // Alt+Tab to cycle forward
      if (e.altKey && e.key === "Tab") {
        e.preventDefault();
        if (!isSwitcherVisible) {
          setIsSwitcherVisible(true);
          setSelectedIndex(1); // Start with second tab selected
        } else {
          handleNavigate('next');
        }
      }

      // Alt+` to cycle backward
      if (e.altKey && e.key === "`") {
        e.preventDefault();
        if (isSwitcherVisible) {
          handleNavigate('prev');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // When Alt is released, activate the selected tab
      if (e.key === "Alt" && isAltHeld && isSwitcherVisible) {
        setIsAltHeld(false);
        handleSelectTab(mockTabs[selectedIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isSwitcherVisible, isAltHeld, selectedIndex]);

  return (
    <div className="min-h-screen bg-background">
      {/* Chrome Tabs Preview */}
      <ChromeTabsPreview tabs={mockTabs} selectedIndex={selectedIndex} />

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center">
        <div className="max-w-4xl space-y-8">
          <div className="space-y-4">
            <h1 className="text-6xl font-bold text-foreground">
              Tab Application Switcher
            </h1>
            <p className="text-2xl text-muted-foreground max-w-2xl mx-auto">
              Like your system's Application Switcher, but for your Chrome tabs
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="gap-2 text-lg px-8 py-6">
              <Download className="w-5 h-5" />
              Install Chrome Extension
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-lg px-8 py-6">
              <Download className="w-5 h-5" />
              Download Electron App
            </Button>
          </div>

          <div className="pt-8">
            <Button
              onClick={() => setIsSwitcherVisible(true)}
              variant="secondary"
              size="lg"
              className="gap-2"
            >
              <Command className="w-4 h-4" />
              Try Live Demo (Alt+Tab)
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              Press <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Alt</kbd> + <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Tab</kbd> to activate
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
          Features
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Keyboard className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">
              Keyboard Shortcuts
            </h3>
            <p className="text-muted-foreground">
              Intelligent and configurable keyboard shortcuts, very similar to your operating system's application switcher.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">
              MRU Ordering
            </h3>
            <p className="text-muted-foreground">
              Tabs are ordered by their last use. The last tab you used is always the first tab to select.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">
              Quick Search
            </h3>
            <p className="text-muted-foreground">
              Search tabs by URL and page title for instant access to any open tab.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">
              Lightning Fast
            </h3>
            <p className="text-muted-foreground">
              Instant response with smooth, native-feeling animations. No lag, no delays.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Command className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">
              Arrow Navigation
            </h3>
            <p className="text-muted-foreground">
              Use arrow keys to move through tabs. Press Enter to select, Esc to close.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <div className="text-2xl font-bold text-primary">1-9</div>
            </div>
            <h3 className="text-xl font-semibold text-foreground">
              Number Shortcuts
            </h3>
            <p className="text-muted-foreground">
              Jump directly to tabs 1-9 using number keys for even faster navigation.
            </p>
          </div>
        </div>
      </div>

      {/* How to Use Section */}
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="bg-card border border-border rounded-xl p-8 space-y-6">
          <h2 className="text-3xl font-bold text-foreground">
            Default Keyboard Shortcuts
          </h2>
          
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3">
              <kbd className="px-3 py-2 bg-muted rounded font-mono text-sm shrink-0">Alt + Tab</kbd>
              <span className="text-muted-foreground pt-1.5">Activate TAS and move forward through tabs</span>
            </div>
            <div className="flex items-start gap-3">
              <kbd className="px-3 py-2 bg-muted rounded font-mono text-sm shrink-0">Alt + `</kbd>
              <span className="text-muted-foreground pt-1.5">Move backward through the list of tabs</span>
            </div>
            <div className="flex items-start gap-3">
              <kbd className="px-3 py-2 bg-muted rounded font-mono text-sm shrink-0">↑ ↓</kbd>
              <span className="text-muted-foreground pt-1.5">Navigate through the list of tabs</span>
            </div>
            <div className="flex items-start gap-3">
              <kbd className="px-3 py-2 bg-muted rounded font-mono text-sm shrink-0">Enter</kbd>
              <span className="text-muted-foreground pt-1.5">Select the highlighted tab</span>
            </div>
            <div className="flex items-start gap-3">
              <kbd className="px-3 py-2 bg-muted rounded font-mono text-sm shrink-0">Esc</kbd>
              <span className="text-muted-foreground pt-1.5">Close TAS without making a selection</span>
            </div>
            <div className="flex items-start gap-3">
              <kbd className="px-3 py-2 bg-muted rounded font-mono text-sm shrink-0">Release Alt</kbd>
              <span className="text-muted-foreground pt-1.5">Select the highlighted tab</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground pt-4 border-t border-border">
            Shortcuts are configurable through the Options panel.
          </p>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="max-w-4xl mx-auto px-8 py-16 text-center">
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-border rounded-xl p-12 space-y-6">
          <h2 className="text-3xl font-bold text-foreground">
            Ready to switch tabs like a pro?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Install the Chrome extension and Electron app to get started
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="gap-2 text-lg px-8 py-6">
              <Download className="w-5 h-5" />
              Install Chrome Extension
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-lg px-8 py-6">
              <Download className="w-5 h-5" />
              Download Electron App
            </Button>
          </div>
        </div>
      </div>

      <TabSwitcher
        tabs={mockTabs}
        isVisible={isSwitcherVisible}
        selectedIndex={selectedIndex}
        onSelectTab={handleSelectTab}
        onClose={() => {
          setIsSwitcherVisible(false);
          setIsAltHeld(false);
        }}
        onNavigate={handleNavigate}
      />
    </div>
  );
};

export default Index;
