import { useState, useEffect } from "react";
import { Settings } from "./components/Settings";
import { getSettings } from "./lib/storage";
import type { AppSettings } from "./lib/types";
import { Settings as SettingsIcon, Clock, ListChecks } from "lucide-react";
import { Button } from "./components/ui/Button";
import { TicketList } from "./components/TicketList";

type View = "list" | "settings";

function App() {
  const [view, setView] = useState<View>("list");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

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
    <div className="w-full h-full min-h-[500px] flex flex-col bg-gray-50 dark:bg-slate-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm transition-colors">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-500">
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
