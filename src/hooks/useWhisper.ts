import { useState, useCallback, useEffect } from "react";
import { WhisperCheckResult } from "../types/electron";
import logger from "../utils/logger";

export interface UseWhisperReturn {
  whisperInstalled: boolean;
  checkingWhisper: boolean;
  checkWhisperInstallation: () => Promise<void>;
}

export const useWhisper = (): UseWhisperReturn => {
  const [whisperInstalled, setWhisperInstalled] = useState(false);
  const [checkingWhisper, setCheckingWhisper] = useState(false);

  const checkWhisperInstallation = useCallback(async () => {
    try {
      setCheckingWhisper(true);
      const result: WhisperCheckResult = await window.electronAPI.checkWhisperInstallation();
      setWhisperInstalled(result.installed && result.working);
    } catch (error) {
      logger.error("Error checking whisper.cpp installation", { error }, "whisper");
      setWhisperInstalled(false);
    } finally {
      setCheckingWhisper(false);
    }
  }, []);

  useEffect(() => {
    checkWhisperInstallation();
  }, [checkWhisperInstallation]);

  return {
    whisperInstalled,
    checkingWhisper,
    checkWhisperInstallation,
  };
};
