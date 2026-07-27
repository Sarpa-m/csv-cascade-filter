---
name: release
description: >
  Guia para criar releases do Filtro CSV em Cascata. Cobre versionamento semântico,
  nomenclatura de tags, geração do csv-cascade-filter.html, notas de release e upload de artefatos.
  Use esta skill sempre que o usuário pedir para lançar uma nova versão, criar um release,
  gerar o bundle, publicar no GitHub Releases, ou mencionar "release", "versão", "tag",
  "csv-cascade-filter.html", "lançar", "publicar".
---

# Release — Processo de lançamento de versão

## Requisitos obrigatórios

Toda release deve incluir:

1. **Tag Git** seguindo SemVer (`vMAJOR.MINOR.PATCH`)
2. **Release notes** em português com seções `✨ Novidades` e `🐛 Correções`
3. **Arquivo compilado** `csv-cascade-filter.html` anexado como artefato
4. **PR title** seguindo Conventional Commits (`feat:`, `fix:`, etc.) para o merge `develop → main`

---

## Versionamento (SemVer)

```
v<MAJOR>.<MINOR>.<PATCH>
```

| Bump    | Quando usar                                                |
|---------|------------------------------------------------------------|
| `MAJOR` | Breaking changes — mudanças incompatíveis com CSV/tabela   |
| `MINOR` | Nova feature (reordenação, histórico, temas, analisador)   |
| `PATCH` | Correção de bug sem feature nova                           |

---

## Passo a passo

### 1. Atualizar `APP_VERSION` no código

Antes do merge, atualizar `src/lib/version.ts`:

```ts
export const APP_VERSION = '1.5.0'; // <-- bump manual
```

### 2. Merge develop → main

O PR de `develop` para `main` deve:

- Ter título seguindo **Conventional Commits**: `feat: descrição curta` ou `fix: descrição`
- Passar em todos os checks de CI
- Após merge, fazer checkout da `main` atualizada:

```bash
git checkout main
git pull origin main
```

### 3. Gerar o csv-cascade-filter.html

O arquivo auto-contido é o artefato principal do projeto — permite abrir o app direto no navegador, sem servidor.

```bash
bash scripts/bundle.sh
```

O output é `csv-cascade-filter.html` na raiz do projeto. **Nunca lance uma release sem este arquivo.**

### 4. Criar a tag

```bash
git tag v<versão>
git push origin v<versão>
```

### 5. Criar o release no GitHub com o bundle anexado

```bash
gh release create v<versão> \
  --title "v<versão> — Resumo curto das novidades" \
  --notes '## ✨ Novidades

### Seção
- feat: descrição
- feat: descrição

### Seção
- feat: descrição

### 📄 Outros
- Descrição

### 🐛 Correções
- fix: descrição
- fix: descrição' \
  csv-cascade-filter.html
```

O `csv-cascade-filter.html` no final do comando faz o upload automático como artefato da release.

---

## Exemplo real

```bash
# 1. Merge develop → main (via PR #7)
git checkout main && git pull origin main

# 2. Bundle
bash scripts/bundle.sh
# ✅ Bundle complete! Output: csv-cascade-filter.html (480K)

# 3. Tag
git tag v1.3.0 && git push origin v1.3.0

# 4. Release com artefato
gh release create v1.3.0 \
  --title "v1.3.0 — Reordenação flexível, ocultar colunas e melhorias na tabela final" \
  --notes '## ✨ Novidades

### 🔄 Reordenação flexível dos filtros
- Botão **Reordenar** na tela de filtros permite voltar à ordem da cascata
- Colunas podem ser **ocultadas** via toggle — não aparecem nos filtros mas continuam na tabela final

### 🔍 Analisador de colunas (1:1)
- Detecta colunas com relação 1:1 e sugere ocultar a de tipo código/ID

### 📊 Melhorias na tabela final
- Coluna "Fonte" removida
- Texto longo truncado com `...` — hover revela conteúdo completo
- Clique na célula copia o texto

### 📄 Footer
- Créditos com links para LinkedIn e GitHub
- Licença CC BY-SA 4.0

### 🐛 Correções
- Crash ao carregar estado sem `tableHistory`' \
  csv-cascade-filter.html
```


## Checklist de release

- [ ] `APP_VERSION` em `src/lib/version.ts` atualizado manualmente
- [ ] PR `develop → main` mergeado
- [ ] `csv-cascade-filter.html` gerado com sucesso (`ls -lh csv-cascade-filter.html`)
- [ ] Tag Git criada e pushada
- [ ] `csv-cascade-filter.html` anexado no release
- [ ] Release notes com seções `## ✨ Novidades` e `## 🐛 Correções`
- [ ] Link do release funciona (`gh release view v<versão>`)

---

## Nomes a evitar

- ~~"versão final"~~, ~~"release candidate"~~, ~~"v1.0"~~ (sem patch)
- ~~"nova versão"~~, ~~"atualização"~~, ~~"fix"~~ — use SemVer com v prefixo
