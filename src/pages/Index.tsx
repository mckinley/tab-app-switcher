import { useState } from "react";
import { TabSwitcher, Tab } from "@/components/TabSwitcher";
import { Button } from "@/components/ui/button";
import { Command } from "lucide-react";

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

  const handleSelectTab = (tabId: string) => {
    console.log("Selected tab:", tabId);
    setIsSwitcherVisible(false);
    // In your actual implementation, this will communicate with the Chrome extension
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="max-w-3xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-foreground">
            Chrome Tab Switcher
          </h1>
          <p className="text-xl text-muted-foreground">
            Mac-like application switcher for your Chrome tabs
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 space-y-6">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">
              Demo Interface
            </h2>
            <p className="text-muted-foreground">
              This is a visual demo of the tab switcher interface. In your actual Chrome extension + Electron app, this will be triggered by a keyboard shortcut.
            </p>
          </div>

          <Button
            onClick={() => setIsSwitcherVisible(true)}
            size="lg"
            className="gap-2"
          >
            <Command className="w-4 h-4" />
            Open Tab Switcher (Cmd+Tab)
          </Button>

          <div className="pt-4 border-t border-border space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Features:</h3>
            <ul className="text-sm text-muted-foreground space-y-1 text-left">
              <li>• Keyboard navigation (↑↓ arrows)</li>
              <li>• Quick search/filter</li>
              <li>• Number shortcuts (1-9)</li>
              <li>• Favicon + title display</li>
              <li>• Fast, snappy animations</li>
              <li>• Native OS-like appearance</li>
            </ul>
          </div>
        </div>

        <div className="bg-muted/30 border border-border/50 rounded-xl p-6 text-sm text-muted-foreground space-y-3">
          <h3 className="text-foreground font-semibold">Implementation Notes:</h3>
          <div className="text-left space-y-2">
            <p>
              <strong>Components:</strong> The TabSwitcher and TabItem components are designed to be framework-agnostic. You can easily port them to your Chrome extension.
            </p>
            <p>
              <strong>Styling:</strong> All colors use CSS custom properties from the design system, making it easy to adapt the theme.
            </p>
            <p>
              <strong>Performance:</strong> Uses CSS transitions instead of heavy animations. Keyboard navigation is instant with no debouncing.
            </p>
          </div>
        </div>
      </div>

      <TabSwitcher
        tabs={mockTabs}
        isVisible={isSwitcherVisible}
        onSelectTab={handleSelectTab}
        onClose={() => setIsSwitcherVisible(false)}
      />
    </div>
  );
};

export default Index;
