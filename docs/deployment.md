# Deployment

`main` stays the default branch and deploys production. `develop` deploys staging. Start feature and fix branches from `develop` and open their pull requests into `develop`. After testing staging, open a release pull request from `develop` into `main`. Check the target branch each time because GitHub may suggest `main`.

Each app has a Docker image. The backend image contains the built app and the database migrations. The frontend image uses Nginx to serve the site, open React pages after a refresh, and send API requests to the backend.

The deployment workflow runs on pushes to `develop` and `main`, using the server runner labelled `les-deploy`. It builds images for the exact commit and skips older runs. It waits for the database, saves a backup, and runs migrations before replacing the apps. It then checks the site, API and database, including public HTTPS. A separate CI workflow runs its existing checks on pull requests into both branches. Unit tests are run locally. Deployments do not wait for CI. Ask an admin to require a teammate review and passing CI on both branches. Until those rules are enforced, the team must check them before merging.

The same Compose file runs as `les-staging` and `les-production`. Each has its own network, database volume and server secrets. Both use secure session cookies and Stripe test keys. The local development Compose file stays separate. No database port is opened on the server.

Each environment has its own Cloudflare Tunnel. Its public hostname points to `http://frontend:80` inside that environment. Cloudflare provides HTTPS. Tunnel routes and DNS are managed in Cloudflare, and tokens stay on the server. Existing connectors keep running during app releases.

Releases run one at a time in each environment. Builds, backups and migrations must succeed before app replacement starts. The last successful commit, Compose file and image IDs are saved for manual app rollback. Database recovery is separate, so migrations must work with the running app. Releases can briefly interrupt requests. Server setup and live checks still need to be completed.
