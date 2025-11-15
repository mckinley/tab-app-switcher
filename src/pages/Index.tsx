import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { TabSwitcher, Tab } from "@/components/TabSwitcher";
import { ChromeTabsPreview } from "@/components/ChromeTabsPreview";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { RGBSplitGlitch } from "@/components/RGBSplitGlitch";
import { Command, Download, Zap, Search, Keyboard, Clock } from "lucide-react";
import { detectPlatform, getBrowserDisplayName, getOSDisplayName } from "@/lib/detectPlatform";
import logo from "@/assets/logo.png";

// Mock data - in your actual extension, this will come from Chrome API
const allTabs: Tab[] = [
  {
    id: "1",
    title: "NOAA - National Oceanic and Atmospheric Administration",
    url: "https://www.noaa.gov/",
    favicon: "https://www.noaa.gov/sites/all/themes/noaa/favicon.ico"
  },
  {
    id: "2",
    title: "Google",
    url: "https://www.google.com/",
    favicon: "https://www.google.com/favicon.ico"
  },
  {
    id: "3",
    title: "NASA",
    url: "https://www.nasa.gov/",
    favicon: "https://www.nasa.gov/favicon.ico"
  },
  {
    id: "4",
    title: "GitHub",
    url: "https://github.com/",
    favicon: "https://github.githubassets.com/favicons/favicon.svg"
  },
  {
    id: "5",
    title: "Wikipedia",
    url: "https://www.wikipedia.org/",
    favicon: "https://www.wikipedia.org/favicon.ico"
  },
  {
    id: "6",
    title: "Apple",
    url: "https://www.apple.com/",
    favicon: "https://www.apple.com/favicon.ico"
  },
  {
    id: "7",
    title: "NRDC - Natural Resources Defense Council",
    url: "https://www.nrdc.org/",
    favicon: "https://www.nrdc.org/sites/default/files/favicon.ico"
  }
];

const Index = () => {
  const [platform] = useState(() => detectPlatform());
  
  // Randomize tab order on mount
  const [tabs] = useState(() => {
    const shuffled = [...allTabs];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });

  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const [mruOrder, setMruOrder] = useState(tabs.map(t => t.id));
  const [isSwitcherVisible, setIsSwitcherVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(1);
  const [isAltHeld, setIsAltHeld] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Get tabs in MRU order for the switcher
  const mruTabs = mruOrder.map(id => tabs.find(t => t.id === id)!).filter(Boolean);

  const handleSelectTab = (tabId: string) => {
    console.log("Selected tab:", tabId);
    setActiveTabId(tabId);
    // Move selected tab to front of MRU order
    setMruOrder(prev => [tabId, ...prev.filter(id => id !== tabId)]);
    setIsSwitcherVisible(false);
    setIsAltHeld(false);
  };

  const handleTabClick = (tabId: string) => {
    setActiveTabId(tabId);
    // Move clicked tab to front of MRU order
    setMruOrder(prev => [tabId, ...prev.filter(id => id !== tabId)]);
  };

  const handleNavigate = (direction: 'next' | 'prev') => {
    setSelectedIndex(prev => {
      if (direction === 'next') {
        return (prev + 1) % mruTabs.length;
      } else {
        return prev === 0 ? mruTabs.length - 1 : prev - 1;
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
      // When Alt is released, activate the selected tab (unless search is focused)
      if (e.key === "Alt" && isAltHeld && isSwitcherVisible && !isSearchFocused) {
        setIsAltHeld(false);
        handleSelectTab(mruTabs[selectedIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isSwitcherVisible, isAltHeld, selectedIndex, isSearchFocused]);

  return (
    <div className="min-h-screen bg-background">
      {/* Chrome Tabs Preview */}
      <ChromeTabsPreview 
        tabs={tabs} 
        activeTabId={activeTabId}
        isVisible={isSwitcherVisible}
        onTabClick={handleTabClick}
      />

      {/* Header - positioned below tabs */}
      <div className="max-w-7xl mx-auto px-4 flex justify-end items-center gap-2 pt-4 pb-8">
        <Link to="/downloads">
          <Button variant="ghost" size="sm">
            Downloads
          </Button>
        </Link>
        <ThemeToggle />
      </div>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center">
        <div className="max-w-4xl space-y-8">
          <div className="space-y-4">
            <RGBSplitGlitch className="mb-12">
              <img 
                src={logo} 
                alt="Tab Application Switcher Logo" 
                className="h-20 w-auto mx-auto rounded-lg"
              />
            </RGBSplitGlitch>
            <RGBSplitGlitch delay={200}>
              <h1 className="text-6xl font-bold text-foreground">
                Tab Application Switcher
              </h1>
            </RGBSplitGlitch>
            <p className="text-2xl text-muted-foreground max-w-2xl mx-auto">
              Like your system's Application Switcher, but for your Chrome tabs
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="gap-2 text-lg px-8 py-6" asChild>
              <a href="#chrome-store" target="_blank" rel="noopener noreferrer">
                <Download className="w-5 h-5" />
                Install {getBrowserDisplayName(platform.browser)} Extension
              </a>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-lg px-8 py-6" asChild>
              <a href="#download-native" download>
                <Download className="w-5 h-5" />
                Download for {getOSDisplayName(platform.os)}
              </a>
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
            <Button size="lg" className="gap-2 text-lg px-8 py-6" asChild>
              <a href="#chrome-store" target="_blank" rel="noopener noreferrer">
                <Download className="w-5 h-5" />
                Install {getBrowserDisplayName(platform.browser)} Extension
              </a>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-lg px-8 py-6" asChild>
              <a href="#download-native" download>
                <Download className="w-5 h-5" />
                Download for {getOSDisplayName(platform.os)}
              </a>
            </Button>
          </div>
          
          <div className="pt-6">
            <Link to="/downloads" className="text-muted-foreground hover:text-foreground transition-colors underline">
              View all download options
            </Link>
          </div>
        </div>
      </div>

      <TabSwitcher
        tabs={mruTabs}
        isVisible={isSwitcherVisible}
        selectedIndex={selectedIndex}
        onSelectTab={handleSelectTab}
        onClose={() => {
          setIsSwitcherVisible(false);
          setIsAltHeld(false);
        }}
        onNavigate={handleNavigate}
        onSearchFocusChange={setIsSearchFocused}
      />
    </div>
  );
};

export default Index;
