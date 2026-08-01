/** Versão atual da aplicação — atualizar manualmente a cada release */
export const APP_VERSION = '1.5.0';

/** URL da API do GitHub para consultar a última release */
const GITHUB_API_URL = 'https://api.github.com/repos/Sarpa-m/csv-cascade-filter/releases/latest';

export interface VersionInfo {
  current: string;
  latest: string | null;
  hasUpdate: boolean;
  releaseUrl: string | null;
}

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
    return null;
  }
}

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
