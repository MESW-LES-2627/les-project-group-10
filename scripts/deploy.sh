#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

fail() { echo "Deployment stopped: $*" >&2; exit 1; }

action=${1:-}
export DEPLOY_ENVIRONMENT=${2:-}
export IMAGE_TAG=${3:-}
case "$action" in deploy|rollback) ;; *) fail 'Use deploy.sh deploy|rollback staging|production FULL_COMMIT_SHA' ;; esac
case "$DEPLOY_ENVIRONMENT" in
  staging) branch=develop ;;
  production) branch=main ;;
  *) fail 'The environment must be staging or production' ;;
esac
[[ "$IMAGE_TAG" =~ ^[0-9a-f]{40}$ ]] || fail 'A full lowercase commit SHA is required'

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
state_dir="${LES_DEPLOY_ROOT:-/srv/les}/$DEPLOY_ENVIRONMENT"
env_file="$state_dir/.env"
release_dir="$state_dir/releases/$IMAGE_TAG"
compose_file="$repo_root/compose.deploy.yml"
[[ -f "$env_file" ]] || fail "Create $env_file first; existing secrets are never replaced"
mkdir -p "$state_dir/backups" "$state_dir/releases"

# Also lock manual releases and rollbacks against the workflow on this server.
exec 9>"$state_dir/deploy.lock"
flock 9

if [[ "$action" == rollback ]]; then
  compose_file="$release_dir/compose.deploy.yml"
  [[ -f "$compose_file" && -f "$release_dir/images" ]] || fail 'No successful release was saved for that commit'
fi

compose() {
  docker compose --project-name "les-$DEPLOY_ENVIRONMENT" --env-file "$env_file" \
    --project-directory "$repo_root" -f "$compose_file" "$@"
}

stage=configuration
partial_backup=''
on_error() {
  local status=$?
  [[ -z "$partial_backup" ]] || rm -f "$partial_backup"
  echo "Release failed during $stage. The last-successful record is unchanged." >&2
  echo 'If app replacement started, use the saved release for manual rollback. Database recovery is separate.' >&2
  exit "$status"
}
trap on_error ERR

# Inspect parsed Compose settings without printing any credentials or sourcing .env as shell code.
compose config --format json | python3 -c '
import json, sys
from urllib.parse import urlparse, unquote
config = json.load(sys.stdin)
env = config["services"]["backend"]["environment"]
db = config["services"]["db"]["environment"]
url = urlparse(env["DATABASE_URL"])
origin = urlparse(env["CLIENT_ORIGIN"])
valid = (
    env["NODE_ENV"] == "production"
    and len(env["JWT_SECRET"]) >= 32
    and env["STRIPE_SECRET_KEY"].startswith("sk_test_")
    and env["STRIPE_PUBLISHABLE_KEY"].startswith("pk_test_")
    and url.scheme in ("postgres", "postgresql") and url.hostname == "db"
    and url.port in (None, 5432)
    and unquote(url.username or "") == db["POSTGRES_USER"]
    and unquote(url.password or "") == db["POSTGRES_PASSWORD"]
    and unquote(url.path[1:]) == db["POSTGRES_DB"]
    and origin.scheme == "https" and origin.hostname
    and origin.path == "" and not origin.query and not origin.fragment
    and not origin.username and not origin.password
    and all(db.get(key) for key in ("POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"))
)
if not valid:
    sys.exit("Invalid deployment settings: use a 32+ character session secret, Stripe test keys, a db database host and an HTTPS origin.")
'

current_head() {
  local remote_head
  remote_head=$(git -C "$repo_root" ls-remote --exit-code origin "refs/heads/$branch") \
    || fail 'The remote branch could not be verified'
  [[ "${remote_head%%[[:space:]]*}" == "$IMAGE_TAG" ]]
}

if [[ "$action" == deploy ]]; then
  [[ "$(git -C "$repo_root" rev-parse HEAD)" == "$IMAGE_TAG" ]] || fail 'Checkout does not match the requested commit'
  # An unreachable remote is a release failure, not permission to deploy old code.
  if ! current_head; then
    echo 'Skipping this release: the remote branch has moved.'
    exit 0
  fi
  stage=build
  for service in backend frontend; do
    image="les-$DEPLOY_ENVIRONMENT-$service:$IMAGE_TAG"
    if docker image inspect "$image" >/dev/null 2>&1; then
      revision=$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$image")
      [[ "$revision" == "$IMAGE_TAG" ]] || fail "Unexpected revision label on $image"
      echo "Reusing $image"
    else
      compose build "$service"
    fi
  done
  # A push that arrived during the build makes this candidate stale as well.
  if ! current_head; then
    echo 'Skipping this release: the remote branch has moved.'
    exit 0
  fi
else
  stage=rollback-images
  # Require the original image IDs. Never silently rebuild a rollback image.
  while read -r image expected_id; do
    actual_id=$(docker image inspect --format '{{.Id}}' "$image")
    [[ "$actual_id" == "$expected_id" ]] || fail "The saved image $image is missing or has changed"
  done < "$release_dir/images"
fi

stage=database
# Starting an existing database must not replace it or change its credentials.
compose up -d --no-recreate --wait --wait-timeout 120 db

stage=backup
backup_dir=$(mktemp -d "$state_dir/backups/$(date -u +%Y%m%dT%H%M%SZ)-$IMAGE_TAG-$action-XXXXXX")
backup="$backup_dir/database.sql.gz"
partial_backup="$backup.partial"
compose exec -T db sh -ec 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump --host=127.0.0.1 --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --no-owner --no-privileges' \
  | gzip > "$partial_backup"
gzip -t "$partial_backup"
mv "$partial_backup" "$backup"
partial_backup=''

if [[ "$action" == deploy ]]; then
  if ! current_head; then
    echo 'Skipping this release: the remote branch has moved.'
    exit 0
  fi
  stage=migrations
  compose run --rm --no-deps -T backend node dist/db/migrate.js
fi

stage=app-replacement
compose up -d --no-deps --no-build --pull never --wait --wait-timeout 180 backend
compose up -d --no-deps --no-build --pull never --wait --wait-timeout 180 frontend

stage=health-checks
# Check the built frontend, an actual SPA route, the API proxy and DB-backed readiness.
compose exec -T frontend sh -ec '
  wget -q -T 10 -O /dev/null http://127.0.0.1/
  wget -q -T 10 -O /dev/null http://127.0.0.1/login
  wget -q -T 10 -O - http://127.0.0.1/api/health | grep -q '\''"status":"ok"'\''
'
compose exec -T db sh -ec 'PGPASSWORD="$POSTGRES_PASSWORD" psql --host=127.0.0.1 --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --set=ON_ERROR_STOP=1 --command="SELECT 1"' >/dev/null

# Only start the connector after the apps pass. Leave existing connectors untouched.
stage=tunnel
compose up -d --no-deps --no-recreate cloudflared

stage=public-health-checks
public_origin=$(compose config --format json | python3 -c 'import json, sys; print(json.load(sys.stdin)["services"]["backend"]["environment"]["CLIENT_ORIGIN"])')
curl_options=(--fail --silent --show-error --connect-timeout 10 --max-time 20 --retry 12 --retry-delay 5 --retry-all-errors)
curl "${curl_options[@]}" "$public_origin/" -o /dev/null
curl "${curl_options[@]}" "$public_origin/login" -o /dev/null
curl "${curl_options[@]}" "$public_origin/api/health" | python3 -c 'import json, sys; sys.exit(0 if json.load(sys.stdin).get("status") == "ok" else 1)'

stage=release-record
mkdir -p "$release_dir"
if [[ "$action" == deploy ]]; then
  cp "$compose_file" "$release_dir/compose.deploy.yml"
  : > "$release_dir/images.tmp"
  for service in backend frontend; do
    image="les-$DEPLOY_ENVIRONMENT-$service:$IMAGE_TAG"
    image_id=$(docker image inspect --format '{{.Id}}' "$image")
    printf '%s %s\n' "$image" "$image_id" >> "$release_dir/images.tmp"
  done
  mv "$release_dir/images.tmp" "$release_dir/images"
fi
if [[ -f "$state_dir/last-successful" && "$(cat "$state_dir/last-successful")" != "$IMAGE_TAG" ]]; then
  cp "$state_dir/last-successful" "$state_dir/previous-successful.tmp"
  mv "$state_dir/previous-successful.tmp" "$state_dir/previous-successful"
fi
printf '%s\n' "$IMAGE_TAG" > "$state_dir/last-successful.tmp"
mv "$state_dir/last-successful.tmp" "$state_dir/last-successful"
echo "Released $IMAGE_TAG to $DEPLOY_ENVIRONMENT. Backup: $backup"
