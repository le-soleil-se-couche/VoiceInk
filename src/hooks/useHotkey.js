import { useEffect } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import { getDefaultHotkey } from "../utils/hotkeys";

export const useHotkey = () => {
  const hotkey = useSettingsStore((s) => s.dictationKey) || getDefaultHotkey();
  const setHotkey = useSettingsStore((s) => s.setDictationKey);

  // Sync hotkey changes made in the Control Panel window via the browser
  // storage event — fires in this window whenever another window updates
  // localStorage, so no IPC changes are needed.
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === "dictationKey" && event.newValue !== null) {
        const current = useSettingsStore.getState().dictationKey;
        if (event.newValue !== current) {
          useSettingsStore.setState({ dictationKey: event.newValue });
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return {
    hotkey,
    setHotkey,
  };
};
