# Deployment

`main` is the production branch and remains GitHub's default. `develop` is staging. Feature and fix pull requests target `develop`; a reviewed release moves from `develop` to `main`.

Staging is at [les-staging.simaob.com](https://les-staging.simaob.com) and uses Neon’s `develop` branch. Production is at [les.simaob.com](https://les.simaob.com) and uses Neon’s `main` branch. Both environments run on Vercel and use Stripe test mode.

When a pull request is merged, GitHub Actions builds and deploys the matching branch, applies database migrations, and checks the app’s health endpoint. Add the repository secrets `VERCEL_TOKEN`, `STAGING_DATABASE_URL`, and `PRODUCTION_DATABASE_URL` under **Settings → Secrets and variables → Actions → Repository secrets**. The Neon URLs must be direct connections for migrations; Vercel uses pooled URLs for the app.

Keep migrations backwards-compatible. If deployment fails after a migration succeeds, that migration remains applied.
