import { useEffect, useRef, useState } from 'react';
import { checkForUpdate, type VersionInfo } from '@/lib/version';
import { APP_VERSION } from '@/lib/version'; // re-exportado para conveniência

const DISMISSED_KEY = 'csv-cascade-filter-version-dismissed';
const LAST_CHECK_KEY = 'csv-cascade-filter-version-last-check';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 dia entre verificações

interface CheckCache {
  version: string;
  checkedAt: number;
}

/**
 * Verifica se há uma nova versão no GitHub Releases.
 *
 * - A consulta à API do GitHub só ocorre uma vez a cada 24h
 * - Se o usuário clicou "Ignorar": nunca mais notifica para ESSA versão
 */
export function useVersionCheck(): VersionInfo | null {
  const [info, setInfo] = useState<VersionInfo | null>(null);
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    // Só consulta a API a cada 24h (evita rate limit e notificações repetidas)
    try {
      const raw = localStorage.getItem(LAST_CHECK_KEY);
      if (raw) {
        const cache: CheckCache = JSON.parse(raw);
        if (Date.now() - cache.checkedAt < CHECK_INTERVAL_MS) {
          return; // cache válido, não consulta API nem notifica
        }
      }
    } catch { /* cache corrompido — consulta a API */ }

    checkForUpdate().then((result) => {
      if (!result) return;

      // Atualiza cache da última verificação
      if (result.latest) {
        localStorage.setItem(
          LAST_CHECK_KEY,
          JSON.stringify({ version: result.latest, checkedAt: Date.now() }),
        );
      }

      if (!result.hasUpdate) return;

      // Se o usuário ignorou essa versão, não notifica
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (dismissed === result.latest) return;

      setInfo(result);
    });
  }, []);

  return info;
}

/** Marca a versão como permanentemente ignorada */
export function dismissVersion(version: string): void {
  localStorage.setItem(DISMISSED_KEY, version);
}

export { APP_VERSION };
