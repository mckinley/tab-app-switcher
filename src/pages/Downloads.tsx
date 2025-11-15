import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, Chrome, Apple, Monitor } from "lucide-react";
import { detectPlatform, getBrowserDisplayName, getOSDisplayName } from "@/lib/detectPlatform";
import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "@/assets/logo.png";

const Downloads = () => {
  const [platform, setPlatform] = useState(() => detectPlatform());

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const browserExtensions = [
    { name: "Chrome", icon: Chrome, url: "#chrome-store" },
    { name: "Firefox", icon: Chrome, url: "#firefox-store" },
    { name: "Safari", icon: Apple, url: "#safari-store" },
    { name: "Edge", icon: Chrome, url: "#edge-store" },
  ];

  const nativeApps = [
    { name: "macOS", icon: Apple, url: "#macos-download" },
    { name: "Windows", icon: Monitor, url: "#windows-download" },
    { name: "Linux", icon: Monitor, url: "#linux-download" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <NavLink to="/" className="flex items-center gap-3">
              <img 
                src={logo} 
                alt="Tab Application Switcher Logo" 
                className="h-8 w-auto rounded opacity-80 hover:opacity-100 transition-opacity"
              />
              <h1 className="text-xl font-bold text-foreground">Tab Application Switcher</h1>
            </NavLink>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link to="/">
                <Button variant="ghost">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-16">
        {/* Detected Platform Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-foreground mb-4">
            Download TAS
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Detected: {getBrowserDisplayName(platform.browser)} on {getOSDisplayName(platform.os)}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="gap-2 text-lg px-8 py-6">
              <Download className="w-5 h-5" />
              Install {getBrowserDisplayName(platform.browser)} Extension
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-lg px-8 py-6">
              <Download className="w-5 h-5" />
              Download for {getOSDisplayName(platform.os)}
            </Button>
          </div>
        </div>

        {/* Browser Extensions Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            Browser Extensions
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {browserExtensions.map((browser) => (
              <a
                key={browser.name}
                href={browser.url}
                className="group bg-card border border-border rounded-xl p-8 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <browser.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {browser.name}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Install TAS extension for {browser.name}
                    </p>
                    <Button variant="outline" className="gap-2">
                      <Download className="w-4 h-4" />
                      Install Extension
                    </Button>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Native Apps Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4 text-center">
            Native UI Apps
          </h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            The Native UI provides OS-level keyboard shortcuts and an overlay that appears above all applications, just like your system's application switcher.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {nativeApps.map((app) => (
              <a
                key={app.name}
                href={app.url}
                className="group bg-card border border-border rounded-xl p-8 hover:border-primary/50 transition-colors text-center"
              >
                <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <app.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {app.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Download for {app.name}
                </p>
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </a>
            ))}
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-card border border-border rounded-xl p-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Why Two Downloads?
          </h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              <strong className="text-foreground">Browser Extension:</strong> Works entirely within your browser. Use keyboard shortcuts to switch between tabs in any browser window. Perfect for getting started quickly.
            </p>
            <p>
              <strong className="text-foreground">Native UI App:</strong> Enhances your experience with OS-level keyboard registration and a system-wide overlay. The switcher appears above all applications, just like Alt+Tab on Windows or Cmd+Tab on macOS.
            </p>
            <p className="pt-4 border-t border-border text-sm">
              You can use the browser extension alone, or combine it with the Native UI for the best experience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Downloads;
