# Deployment

The deployment workflow maps `develop` to staging and `main` to production. It runs only when code is pushed to those branches. Release pull requests go from `develop` into `main`. The default branch and the rule requiring a teammate review are set in GitHub, not by the workflow.

Each app has a Docker image. The backend image contains the built app and the database migrations. The frontend image uses Nginx to serve the site, open React pages after a refresh, and send API requests to the backend.

The workflow uses the server runner labelled `les-deploy`. It builds images for the exact commit and skips older runs when the branch has moved. It waits for the database, saves a backup, and runs migrations before replacing the apps. It then checks the site, API and database, including the public HTTPS pages. A failed step fails the release. A separate CI workflow checks pull requests into `main`. Deployments do not wait for CI.

The same Compose file runs as `les-staging` and `les-production`. Each has its own network, database volume and server secrets. Both use secure session cookies and Stripe test keys. The local development Compose file stays separate. No database port is opened on the server.

Each environment has its own Cloudflare Tunnel. Its public hostname points to `http://frontend:80` inside that environment. Cloudflare provides HTTPS. Tunnel routes and DNS are managed in Cloudflare, and tokens stay on the server. Existing connectors keep running during app releases.

Releases run one at a time in each environment. Builds, backups and migrations must succeed before app replacement starts. The last successful commit, Compose file and image IDs are saved for manual app rollback. Database recovery is separate, so migrations must work with the running app. Releases can briefly interrupt requests. Server setup and live checks still need to be completed.
