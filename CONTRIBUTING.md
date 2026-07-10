# Contribuindo

## Regras de ouro

- **Nunca commitar direto na `main`.** Todo código entra via Pull Request.
- **Commits seguem o padrão [Conventional Commits](https://www.conventionalcommorts.org/).**
- **Nunca gerar linhas artificiais.** Ver `CLAUDE.md` — Regra de Ouro.

## Branches

```
main          ← produção (estável, deployável)
feature/*     ← funcionalidades novas
fix/*         ← correções
chore/*       ← tarefas técnicas (deps, CI, configs)
docs/*        ← documentação
refactor/*    ← refatoração sem mudança de comportamento
```

### Fluxo

```
feature/* ──► main   (via Pull Request)
fix/*     ──► main   (via Pull Request)
```

### Nomenclatura

```
feature/descricao-curta
fix/descricao-curta
```

## Commits

Formato: `<tipo>[escopo]: <descrição>`

| Tipo | Uso |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Documentação |
| `refactor` | Refatoração |
| `test` | Testes |
| `chore` | Tarefas técnicas |
| `ci` | CI/CD |
| `build` | Build/dependências |

```
feat(cascade): adiciona avanço automático quando sobra 1 opção
fix(parser): trata aspas escapadas em campos CSV
chore: atualiza dependências
```

## Pull Requests

1. Crie uma branch a partir de `main`
2. Desenvolva com commits semânticos
3. Push e abra PR para `main`
4. Aguarde CI passar (TypeScript + testes + build)
5. Solicite revisão
6. Após aprovação: **Squash and Merge**

## Testes

- Testes são obrigatórios para `lib/` e `hooks/`
- Manter cobertura alta em `cascadeLogic.ts` e `csvParser.ts`
- Rodar `pnpm test` antes de commitar

## Build

```bash
pnpm install        # instalar dependências
pnpm dev            # dev server
pnpm test           # rodar testes
pnpm build          # build produção
pnpm bundle         # gerar bundle.html auto-contido
```
