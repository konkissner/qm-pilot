# Deploy Log — QM-Pilot (URS-F-048, URS-F-052)

Software releases are **Git tags** on CI-green commits only. This file records production deployments (human + CI).

| Version (tag) | Date (UTC) | Deployed by | CI run | Health gate | Notes |
|---------------|------------|-------------|--------|-------------|-------|
| _example v0.1.0_ | _2026-07-07_ | _github-actions[bot]_ | _https://…_ | _pass_ | _Initial prod stack_ |

## Process

1. Merge to `main` → auto-deploy **test** VM after green CI
2. Tag `v*` on green commit → manual approval in GitHub `production` environment → deploy prod
3. Failed health gate: workflow aborts; previous containers keep running

See `.github/workflows/deploy.yml`.
