# Deployment

`main` is the production branch and remains GitHub's default. `develop` is staging. Feature and fix pull requests target `develop`; a reviewed release moves from `develop` to `main`.

Staging is at [les-staging.simaob.com](https://les-staging.simaob.com) and uses Neon’s `develop` branch. Production is at [les.simaob.com](https://les.simaob.com) and uses Neon’s `main` branch. Both environments run on Vercel and use Stripe test mode.

Pushes to `develop` deploy staging only; pushes to `main` deploy production only. Before deployment, GitHub Actions calls the same CI workflow used by pull requests: formatting, publisher tests, linting, type checks, builds, unit tests and database integration tests must all pass for that commit. Only then can the release job apply migrations or publish. Deployments to the same environment run serially without interrupting an active migration or publish.

The publisher uploads a staged production build without assigning domains. It checks the exact deployment through authenticated Vercel requests: the API must report the expected commit and required database migration, and the page and JavaScript must match the artifact. Only a passing build is promoted. It then checks the public domain without authentication and requires the same commit. A failed staged check leaves the current site in place.

Add the repository secrets `VERCEL_TOKEN`, `STAGING_DATABASE_URL`, and `PRODUCTION_DATABASE_URL` under **Settings → Secrets and variables → Actions → Repository secrets**. The Neon URLs must be direct connections for migrations; Vercel uses pooled URLs for the app. CI supplies the Vercel project IDs; no local `.vercel` link files are required on the runner.

To check the artifact locally, run `npm run deploy:build`. The build records its Git commit and latest migration automatically; no extra runtime variables need to be entered in Vercel. Run publisher regression tests with `node --test scripts/tests/*.test.mjs`; they use a fake CLI and never publish. `node scripts/publish-deployment.mjs staging --stage-only` uploads and verifies a candidate without promoting it; this requires Vercel authentication and the staging project link or CI project IDs.

A repository admin should require pull requests and the `Format`, `Backend` and `Frontend` checks on both `develop` and `main`. The deployment workflow also runs its own validation, so it cannot bypass failing tests when branch rules are unavailable. The first automated staging run after merging verifies the Actions credentials, Neon migration connection and Vercel publishing together.

Keep migrations backwards-compatible. If deployment fails after a migration succeeds, that migration remains applied.
