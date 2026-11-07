# Deployment

`main` is the production branch and remains GitHub's default. `develop` is staging. Feature and fix pull requests target `develop`; a reviewed release moves from `develop` to `main`.

Staging is at [les-staging.simaob.com](https://les-staging.simaob.com) and uses Neon’s `develop` branch. Production is at [les.simaob.com](https://les.simaob.com) and uses Neon’s `main` branch. Both environments run on Vercel and use Stripe test mode.

Pushes to `develop` deploy staging only; pushes to `main` deploy production only. GitHub Actions builds the app, applies the matching database migrations, publishes to the matching Vercel project, and checks its public health endpoint. Deployments to the same environment run serially so a newer push cannot interrupt a migration or publish in progress.

Add the repository secrets `VERCEL_TOKEN`, `STAGING_DATABASE_URL`, and `PRODUCTION_DATABASE_URL` under **Settings → Secrets and variables → Actions → Repository secrets**. The Neon URLs must be direct connections for migrations; Vercel uses pooled URLs for the app. CI supplies the Vercel project IDs; no local `.vercel` link files are required on the runner.

To check the deployable artifact locally, run `npm run deploy:build`. Run the publisher regression tests with `node --test scripts/tests/*.test.mjs`; they use a fake Vercel CLI and never publish. Pull request CI runs these tests alongside formatting and the backend/frontend checks.

Keep migrations backwards-compatible. If deployment fails after a migration succeeds, that migration remains applied.
