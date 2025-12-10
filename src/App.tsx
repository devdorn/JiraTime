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

  useEffect(() => {
    checkConfig();
  }, []);

  const checkConfig = async () => {
    const s = await getSettings();
    setSettings(s);
    if (!s?.jiraHost || !s?.jiraPat) {
      setView("settings");
    }
    setLoading(false);
  };

  const handleSaveSettings = () => {
    checkConfig(); // Reload settings
    setView("list");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-gray-500">
      <Clock className="animate-pulse mr-2" /> Loading...
    </div>;
  }

  return (
    <div className="w-full h-full min-h-[500px] flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2 text-blue-600">
          <Clock size={24} className="stroke-[2.5px]" />
          <h1 className="text-lg font-bold tracking-tight text-gray-900">JiraTime</h1>
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
            onCancel={() => setView("list")}
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
