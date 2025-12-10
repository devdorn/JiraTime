import { useState, useEffect } from "react";
import { Settings } from "./components/Settings";
import { getSettings } from "./lib/storage";
import type { AppSettings } from "./lib/types";
import { Settings as SettingsIcon, Clock, ListChecks } from "lucide-react";
import { Button } from "./components/ui/Button";
import { TicketList } from "./components/TicketList";
import { cn } from "./lib/utils";



type View = "list" | "settings";

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

        {settings && view === "list" && (
          <Button variant="ghost" className="p-2 h-auto text-gray-500" onClick={() => setView("settings")}>
            <SettingsIcon size={20} />
          </Button>
        )}
        {view === "settings" && settings && (
          <Button variant="ghost" className="p-2 h-auto text-gray-500" onClick={() => setView("list")}>
            <ListChecks size={20} />
          </Button>
        )}
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
        ) : settings ? (
          <TicketList settings={settings} />
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
