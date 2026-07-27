import { INJECTED_VERSION } from './version.generated';

/**
 * Versão atual da aplicação.
 *
 * - Vite (dev/build): `define` em vite.config.ts substitui `import.meta.env.VITE_APP_VERSION`
 *   pelo valor da tag git (`git describe --tags`)
 * - Parcel (bundle.sh): gera `version.generated.ts` antes do build
 * - Fallback: `'0.0.0'`
 */
export const APP_VERSION: string =
  import.meta.env.VITE_APP_VERSION ?? INJECTED_VERSION ?? '0.0.0';

/** URL da API do GitHub para consultar a última release */
const GITHUB_API_URL = 'https://api.github.com/repos/Sarpa-m/csv-cascade-filter/releases/latest';

export interface VersionInfo {
  /** Versão atual (local) */
  current: string;
  /** Versão mais recente no GitHub, ou null se não foi possível consultar */
  latest: string | null;
  /** true se há uma versão mais nova disponível */
  hasUpdate: boolean;
  /** URL da release mais recente */
  releaseUrl: string | null;
}

/**
 * Consulta a última release no GitHub e compara com a versão local.
 * Retorna null se a consulta falhar (sem rede, rate limit, etc.).
 */
export async function checkForUpdate(): Promise<VersionInfo | null> {
  try {
    const res = await fetch(GITHUB_API_URL, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return null;

    const release = await res.json() as {
      tag_name: string;
      html_url: string;
    };

    const latestTag = release.tag_name.replace(/^v/, '');
    const hasUpdate = compareVersions(latestTag, APP_VERSION) > 0;

    return {
      current: APP_VERSION,
      latest: latestTag,
      hasUpdate,
      releaseUrl: release.html_url,
    };
  } catch {
    return null; // sem rede ou erro — falha silenciosamente
  }
}

/**
 * Compara duas versões SemVer (ex.: "1.3.0" vs "1.2.0").
 * Retorna positivo se a > b, negativo se a < b, 0 se iguais.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}
