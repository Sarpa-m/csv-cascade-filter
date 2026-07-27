/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Versão da aplicação injetada pelo Vite a partir da tag git */
  readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
