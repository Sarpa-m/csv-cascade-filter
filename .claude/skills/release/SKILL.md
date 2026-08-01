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
2. **Release notes** em português, seguindo o [padrão de descrição](#padrão-de-descrição-de-release) abaixo
3. **Arquivo compilado** `csv-cascade-filter.html` anexado como artefato (feito automaticamente pelo CI)
4. **PR title** seguindo Conventional Commits (`feat:`, `fix:`, etc.) para qualquer PR mergeado em `main`

---

## Padrão de descrição de release

A descrição de toda release segue esta estrutura fixa. **Seções vazias são omitidas** — nunca deixar um cabeçalho sem itens embaixo.

```markdown
### ✨ Novidades
- <o que o usuário ganha, não o nome do commit>
- ...

### 🐛 Correções
- <bug corrigido e o efeito percebido, não a causa técnica interna>
- ...

### ⚙️ Infraestrutura
- <CI/CD, build, scripts, versionamento — não afeta o usuário final>
- ...

### 📚 Documentação
- <README, skills, comentários de arquitetura>
- ...

---
**Full Changelog**: https://github.com/Sarpa-m/csv-cascade-filter/compare/v<anterior>...v<atual>
```

Regras:

- **Ordem fixa** das seções: Novidades → Correções → Infraestrutura → Documentação. Nunca reordenar.
- **Uma seção só aparece se tiver conteúdo.** Release só de CI não tem `✨ Novidades`; release só de bugfix de app não tem `⚙️ Infraestrutura`.
- **Itens descrevem impacto, não o commit.** Traduza `fix(ci): dispara release em tags v*` para algo como "Release passa a disparar automaticamente ao criar uma tag `v*`".
- **Correção de app-bug (afeta o usuário) vai em `🐛 Correções`.** Ajuste de pipeline/script/CI vai em `⚙️ Infraestrutura`, mesmo que o commit tenha sido `fix:`.
- **Sempre termina com o link `Full Changelog`** comparando com a tag anterior (não incluir na primeiríssima release, `v1.0.0`, que não tem tag anterior).
- **Não duplicar a lista "What's Changed" bruta do GitHub** (PRs/autores) — o release é criado com `generate_release_notes: false` implícito porque o `body` já é fornecido; se precisar da lista de PRs por rastreabilidade, ela fica só no link `Full Changelog`.
- **Não usar bloco "Download"** explicando que o arquivo roda no navegador — isso já é padrão do projeto (ver `README.md`) e o asset já aparece na seção "Assets" do GitHub.

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

O pipeline de release é **totalmente automático a partir da tag** — não há PR de release, não há bump manual, não há geração manual do bundle. O único gatilho humano é criar e empurrar a tag.

### 1. Garantir que `main` está com tudo que deve entrar na release

Todo o trabalho de feature/fix entra em `main` via PR normal (título em Conventional Commits, checks verdes). Confirme que `main` está atualizada:

```bash
git checkout main
git pull origin main
```

### 2. Criar e empurrar a tag

```bash
git tag v<versão>
git push origin v<versão>
```

Isso dispara `.github/workflows/ci.yml`, que roda em sequência:

1. **`bump`** — atualiza `APP_VERSION` em `src/lib/version.ts` e o badge do `README.md` para `<versão>`, e faz commit + push **direto em `main`** (usa o secret `RELEASE_TOKEN`, que tem permissão de bypass da proteção de branch — ver `enforce_admins` desativado nas branch protection rules).
2. **`test`** — typecheck + testes.
3. **`bundle`** — gera `csv-cascade-filter.html` já com a versão da tag injetada via `--version`.
4. **`release`** — cria o release no GitHub com o bundle anexado como asset.

Isso substitui as etapas manuais "atualizar `APP_VERSION`", "gerar bundle" e "criar release" que existiam antes — não faça nenhuma delas manualmente.

### 3. Acompanhar a run

```bash
gh run watch --exit-status
```

Confirme ao final:

```bash
gh release view v<versão> --json tagName,isDraft,assets
```

### 4. Escrever a descrição da release

O job `release` cria o release **sem corpo customizado** (só o asset). Depois que a run termina, escreva a descrição seguindo o [padrão acima](#padrão-de-descrição-de-release) e aplique com:

```bash
gh release edit v<versão> --notes "$(cat <<'EOF'
### ✨ Novidades
- ...

### 🐛 Correções
- ...
EOF
)"
```

Base o conteúdo no diff real, não em suposições:

```bash
git log --oneline v<versão-anterior>..v<versão>
```

---

## Exemplo real

```bash
git tag v1.4.4 && git push origin v1.4.4
gh run watch --exit-status
gh release edit v1.4.4 --notes "$(cat <<'EOF'
### 🐛 Correções
- Pipeline de release não depende mais de PR: o bump de versão pós-tag falhava por falta de permissão de Actions para criar PRs — agora é feito via push direto em \`main\`
- Job de release não é mais pulado silenciosamente quando o bump falha

### ⚙️ Infraestrutura
- Removido o workflow \`bump-version.yml\`, duplicado e obsoleto

---
**Full Changelog**: https://github.com/Sarpa-m/csv-cascade-filter/compare/v1.4.3...v1.4.4
EOF
)"
```

## Checklist de release

- [ ] `main` atualizada com tudo que deve entrar na release
- [ ] Tag Git criada e pushada (`git tag vX.Y.Z && git push origin vX.Y.Z`)
- [ ] Run do CI verde (`bump` → `test` → `bundle` → `release`)
- [ ] `csv-cascade-filter.html` anexado como asset (`gh release view vX.Y.Z --json assets`)
- [ ] Descrição da release reescrita seguindo o [padrão de descrição](#padrão-de-descrição-de-release)
- [ ] `APP_VERSION` em `main` bate com a tag (`gh api repos/Sarpa-m/csv-cascade-filter/contents/src/lib/version.ts`)

---

## Nomes a evitar

- ~~"versão final"~~, ~~"release candidate"~~, ~~"v1.0"~~ (sem patch)
- ~~"nova versão"~~, ~~"atualização"~~, ~~"fix"~~ — use SemVer com v prefixo
