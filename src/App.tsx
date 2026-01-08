import { useState, useEffect } from "react";
import { Settings } from "./components/Settings";
import { getSettings } from "./lib/storage";
import type { AppSettings } from "./lib/types";
import { Settings as SettingsIcon, Clock, ListChecks, HelpCircle } from "lucide-react";
import { Button } from "./components/ui/Button";
import { TicketList } from "./components/TicketList";
import { cn } from "./lib/utils";



type View = "list" | "settings" | "about";

function App() {
  const [view, setView] = useState<View>("list");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Easter Egg State
  const [logoClicks, setLogoClicks] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [isLudicrousMode, setIsLudicrousMode] = useState(false);

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickTime > 2000) {
      // Reset if too slow
      setLogoClicks(1);
    } else {
      const newCount = logoClicks + 1;
      setLogoClicks(newCount);
      if (newCount === 5) {
        // Trigger Ludicrous Mode
        setIsLudicrousMode(prev => !prev);
        setLogoClicks(0); // Reset
      }
    }
    setLastClickTime(now);
  };

  const [previewTheme, setPreviewTheme] = useState<AppSettings['theme'] | null>(null);

  useEffect(() => {
    checkConfig();
  }, []);

  // Apply theme
  useEffect(() => {
    const activeTheme = previewTheme || settings?.theme || 'system';

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (activeTheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const applySystemTheme = (e: MediaQueryListEvent | MediaQueryList) => {
        const systemTheme = e.matches ? 'dark' : 'light';
        root.classList.remove('light', 'dark');
        root.classList.add(systemTheme);
      };

      applySystemTheme(mediaQuery);

      const handler = (e: MediaQueryListEvent) => applySystemTheme(e);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      root.classList.add(activeTheme);
    }
  }, [settings?.theme, previewTheme]);

  const checkConfig = async () => {
    const s = await getSettings();
    setSettings(s);
    if (!s?.jiraHost || !s?.jiraPat) {
      setView("settings");
    }
    setLoading(false);
  };

  const handleSaveSettings = () => {
    setPreviewTheme(null);
    checkConfig(); // Reload settings
    setView("list");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-gray-500">
      <Clock className="animate-pulse mr-2" /> Loading...
    </div>;
  }

  return (
    <div className={cn(
      "w-full h-full min-h-[500px] flex flex-col bg-gray-50 dark:bg-slate-900 transition-colors",
      isLudicrousMode && "ludicrous-mode"
    )}>
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm transition-colors">
        <div
          className="flex items-center gap-2 text-blue-600 dark:text-blue-500 cursor-pointer select-none active:scale-95 transition-transform"
          onClick={handleLogoClick}
        >
          <Clock size={24} className="stroke-[2.5px]" />
          <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">JiraTime</h1>
        </div>

        <div className="flex items-center gap-1">
          {settings && view !== "about" && (
            <Button variant="ghost" className="p-2 h-auto text-gray-500" onClick={() => setView("about")} title="About">
              <HelpCircle size={20} />
            </Button>
          )}
          {settings && view === "list" && (
            <Button variant="ghost" className="p-2 h-auto text-gray-500" onClick={() => setView("settings")} title="Settings">
              <SettingsIcon size={20} />
            </Button>
          )}
          {view !== "list" && settings && (
            <Button variant="ghost" className="p-2 h-auto text-gray-500" onClick={() => setView("list")} title="Back to List">
              <ListChecks size={20} />
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {view === "settings" ? (
          <Settings
            onSave={handleSaveSettings}
            showCancel={!!settings}
            onCancel={() => {
              setPreviewTheme(null);
              setView("list");
            }}
            onThemeChange={setPreviewTheme}
          />
        ) : view === "about" ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-6 rounded-full text-blue-600 dark:text-blue-400 mb-2 animate-bounce">
              <Clock size={48} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">JiraTime</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">v{__APP_VERSION__}</p>
              <p className="text-xs text-gray-400 mt-2">
                Found a bug? <a href="https://github.com/devdorn/JiraTime/issues" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Report an issue</a>
              </p>
            </div>

            <div className="text-gray-600 dark:text-gray-300 space-y-1">
              <p>Created by <strong className="text-gray-900 dark:text-white">Bernhard Dorn</strong></p>
              <p className="text-xs text-gray-400 mt-4">© 2025 All Rights Reserved.</p>
            </div>

            <Button variant="secondary" onClick={() => setView("list")}>
              Back to Tickets
            </Button>
          </div>
        ) : settings ? (
          <TicketList settings={settings} onSettingsChange={checkConfig} />
        ) : (
          <div className="p-8 text-center text-gray-500">
            Please configure settings first.
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
