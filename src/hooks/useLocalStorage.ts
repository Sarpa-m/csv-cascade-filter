import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'csv-cascade-filter-state';

/**
 * Hook genérico de persistência em localStorage com leitura/escrita imediata.
 * Salva incrementalmente a cada mudança — a key é fixa (app inteiro em um objeto).
 */
export function useLocalStorage<T>(
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Lazy initializer: lê do localStorage uma única vez
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as T;
      }
    } catch {
      // Dado corrompido ou inexistente — usa default
    }
    return defaultValue;
  });

  // Ref para evitar loop de escrita quando inicializar
  const initialized = useRef(false);

  // Persiste no localStorage sempre que o state mudar
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage cheio ou indisponível — falha silenciosamente
    }
  }, [state]);

  const reset = useCallback(() => {
    setState(defaultValue);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignora
    }
  }, [defaultValue]);

  return [state, setState, reset];
}
