import { useState, useCallback } from "react";
import logger from "../utils/logger";

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  }
) {
  const serialize = options?.serialize || JSON.stringify;
  const deserialize = options?.deserialize || JSON.parse;

  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        // Persist the default so direct localStorage.getItem() reads
        // (e.g. in audioManager, PromptStudio) see the intended value.
        localStorage.setItem(key, serialize(defaultValue));
        return defaultValue;
      }
      return deserialize(item);
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prevState: T) => T)) => {
      setState((currentState) => {
        try {
          const valueToStore = value instanceof Function ? value(currentState) : value;
          localStorage.setItem(key, serialize(valueToStore));
          return valueToStore;
        } catch (error) {
          logger.error(`Error setting localStorage key "${key}"`, { error }, "storage");
          return currentState;
        }
      });
    },
    [key, serialize]
  );

  const remove = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setState(defaultValue);
    } catch (error) {
      logger.error(`Error removing localStorage key "${key}"`, { error }, "storage");
    }
  }, [key, defaultValue]);

  return [state, setValue, remove] as const;
}
