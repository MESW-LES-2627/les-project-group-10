"""Exercise release failure boundaries without a Docker daemon or server secrets.

Run from the repository root: python3 -m unittest discover -s scripts/tests -v
"""

import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


SHA = "a" * 40
NEXT_SHA = "b" * 40
ROOT = Path(__file__).resolve().parents[2]

MOCK_TOOL = r'''#!/usr/bin/env python3
import fcntl, hashlib, json, os, pathlib, sys
name = pathlib.Path(sys.argv[0]).name
args = sys.argv[1:]
root = pathlib.Path(os.environ["MOCK_ROOT"])
def log(event):
    with (root / "events").open("a") as f:
        f.write(event + "\n")
def fail(event):
    if os.environ.get("FAIL_AT") == event:
        sys.exit(42)
if name == "flock":
    fcntl.flock(int(args[0]), fcntl.LOCK_EX)
elif name == "git":
    if "rev-parse" in args:
        print(os.environ["DEPLOY_SHA"])
    elif "ls-remote" in args:
        log("remote-check")
        fail("remote-check")
        checks = (root / "events").read_text().count("remote-check")
        moved = checks >= int(os.environ.get("MOVE_AT_CHECK", "100"))
        print(("c" * 40 if moved else os.environ["DEPLOY_SHA"]) + "\trefs/heads/main")
elif name == "curl":
    log("public-check")
    fail("public-check")
    if "-o" not in args:
        print('{"status":"ok"}')
elif name == "docker":
    registry = root / "images.json"
    images = json.loads(registry.read_text()) if registry.exists() else {}
    if args[:2] == ["image", "inspect"]:
        image = args[-1]
        if image not in images:
            sys.exit(1)
        if "--format" in args:
            print(image.rsplit(":", 1)[-1] if "Labels" in args[args.index("--format") + 1] else images[image])
        sys.exit(0)
    project = args[args.index("--project-name") + 1]
    tag = os.environ["IMAGE_TAG"]
    cmd = args[args.index("-f") + 2:]
    if cmd[0] == "config":
        print(json.dumps({"services": {
            "backend": {"environment": {
                "NODE_ENV": "production", "JWT_SECRET": "x" * 48,
                "STRIPE_SECRET_KEY": os.environ.get("TEST_STRIPE_KEY", "sk_test_fake"),
                "STRIPE_PUBLISHABLE_KEY": "pk_test_fake",
                "DATABASE_URL": os.environ.get("TEST_DATABASE_URL", "postgres://test:secret@db:5432/test"),
                "CLIENT_ORIGIN": "https://example.com"}},
            "db": {"environment": {"POSTGRES_USER": "test", "POSTGRES_PASSWORD": "secret", "POSTGRES_DB": "test"}}
        }}))
    elif cmd[0] == "build":
        service = cmd[-1]
        log("build-" + service)
        fail("build-" + service)
        image = project + "-" + service + ":" + tag
        images[image] = "sha256:" + hashlib.sha256(image.encode()).hexdigest()
        registry.write_text(json.dumps(images))
    elif cmd[0] == "up":
        service = cmd[-1]
        log("up-" + service)
        fail("up-" + service)
        if service in ("backend", "frontend"):
            assert "--no-deps" in cmd and "--no-build" in cmd and "--pull" in cmd
        else:
            assert "--no-recreate" in cmd
    elif cmd[0] == "run":
        log("migrate")
        assert "--no-deps" in cmd and "dist/db/migrate.js" in cmd
        fail("migrate")
    elif cmd[0] == "exec":
        if "pg_dump" in cmd[-1]:
            log("backup")
            fail("backup")
            print("-- a database backup")
        elif "psql" in cmd[-1]:
            log("database-check")
            fail("database-check")
        else:
            log("internal-check")
            fail("internal-check")
    else:
        sys.exit("Unexpected Docker call: " + repr(cmd))
'''


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / "repo"
        (self.repo / "scripts").mkdir(parents=True)
        shutil.copy(ROOT / "scripts/deploy.sh", self.repo / "scripts/deploy.sh")
        shutil.copy(ROOT / "compose.deploy.yml", self.repo / "compose.deploy.yml")
        self.bin = self.root / "bin"
        self.bin.mkdir()
        tool = self.bin / "mock"
        tool.write_text(MOCK_TOOL)
        tool.chmod(0o755)
        for name in ("docker", "git", "curl", "flock"):
            (self.bin / name).symlink_to(tool)
        self.env = {
            **os.environ,
            "PATH": f"{self.bin}:{os.environ['PATH']}",
            "MOCK_ROOT": str(self.root),
            "LES_DEPLOY_ROOT": str(self.root / "server"),
            "DEPLOY_SHA": SHA,
        }
        for environment in ("staging", "production"):
            state = self.state(environment)
            state.mkdir(parents=True)
            (state / ".env").write_text("# Existing server secrets must survive unchanged\n")

    def state(self, environment="staging"):
        return self.root / "server" / environment

    def run_release(self, action="deploy", environment="staging", sha=SHA, **overrides):
        return subprocess.run(
            ["bash", str(self.repo / "scripts/deploy.sh"), action, environment, sha],
            env={**self.env, "DEPLOY_SHA": sha, **overrides},
            capture_output=True,
            text=True,
        )

    def events(self):
        path = self.root / "events"
        return path.read_text().splitlines() if path.exists() else []

    def test_success_builds_backs_up_migrates_replaces_and_records_in_order(self):
        result = self.run_release()
        self.assertEqual(result.returncode, 0, result.stderr)
        events = self.events()
        order = ["build-backend", "build-frontend", "up-db", "backup", "migrate", "up-backend", "up-frontend", "internal-check", "database-check", "up-cloudflared", "public-check"]
        self.assertEqual(sorted(order, key=events.index), order)
        self.assertEqual((self.state() / "last-successful").read_text().strip(), SHA)
        self.assertEqual(len((self.state() / "releases" / SHA / "images").read_text().splitlines()), 2)
        self.assertEqual(len(list((self.state() / "backups").rglob("*.sql.gz"))), 1)
        self.assertIn("Existing server secrets", (self.state() / ".env").read_text())

    def test_failures_before_replacement_leave_apps_and_success_record_untouched(self):
        for failure in ("build-backend", "build-frontend", "up-db", "backup", "migrate"):
            with self.subTest(failure=failure):
                (self.state() / "last-successful").write_text(NEXT_SHA + "\n")
                result = self.run_release(FAIL_AT=failure)
                self.assertNotEqual(result.returncode, 0)
                self.assertNotIn("up-backend", self.events())
                self.assertEqual((self.state() / "last-successful").read_text().strip(), NEXT_SHA)
                self.assertFalse(list((self.state() / "backups").rglob("*.partial")))

    def test_failed_health_checks_do_not_mark_a_release_successful(self):
        for failure in ("up-backend", "up-frontend", "internal-check", "database-check", "up-cloudflared", "public-check"):
            with self.subTest(failure=failure):
                result = self.run_release(FAIL_AT=failure)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse((self.state() / "last-successful").exists())

    def test_old_runs_are_skipped_before_build_or_before_migrations(self):
        for check in (1, 2, 3):
            with self.subTest(check=check):
                (self.root / "events").write_text("")
                result = self.run_release(MOVE_AT_CHECK=str(check))
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertNotIn("migrate", self.events())
                self.assertNotIn("up-backend", self.events())
                self.assertFalse((self.state() / "last-successful").exists())

    def test_unreachable_remote_fails_without_replacing_apps(self):
        result = self.run_release(FAIL_AT="remote-check")
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("up-backend", self.events())

    def test_live_keys_and_wrong_database_host_or_credentials_are_rejected(self):
        for overrides in (
            {"TEST_STRIPE_KEY": "sk_live_fake"},
            {"TEST_DATABASE_URL": "postgres://test:secret@localhost:5432/test"},
            {"TEST_DATABASE_URL": "postgres://wrong:secret@db:5432/test"},
        ):
            with self.subTest(overrides=overrides):
                result = self.run_release(**overrides)
                self.assertNotEqual(result.returncode, 0)
                self.assertNotIn("up-db", self.events())

    def test_staging_and_production_keep_separate_state_and_images(self):
        for environment in ("staging", "production"):
            result = self.run_release(environment=environment)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual((self.state(environment) / "last-successful").read_text().strip(), SHA)
        images = json.loads((self.root / "images.json").read_text())
        self.assertEqual(len(images), 4)

    def test_rerunning_a_commit_reuses_saved_images(self):
        self.assertEqual(self.run_release().returncode, 0)
        (self.root / "events").write_text("")
        result = self.run_release()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("build-backend", self.events())
        self.assertNotIn("build-frontend", self.events())

    def test_rollback_uses_original_images_without_builds_migrations_or_remote(self):
        self.assertEqual(self.run_release().returncode, 0)
        (self.root / "events").write_text("")
        result = self.run_release(action="rollback")
        self.assertEqual(result.returncode, 0, result.stderr)
        for event in ("build-backend", "build-frontend", "migrate", "remote-check"):
            self.assertNotIn(event, self.events())
        self.assertIn("backup", self.events())
        self.assertIn("up-backend", self.events())

    def test_rollback_refuses_missing_or_changed_images(self):
        self.assertEqual(self.run_release().returncode, 0)
        images = json.loads((self.root / "images.json").read_text())
        images[next(iter(images))] = "sha256:changed"
        (self.root / "images.json").write_text(json.dumps(images))
        (self.root / "events").write_text("")
        result = self.run_release(action="rollback")
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("up-backend", self.events())

    def test_failed_replacement_preserves_the_successful_release_for_rollback(self):
        self.assertEqual(self.run_release().returncode, 0)
        result = self.run_release(sha=NEXT_SHA, FAIL_AT="public-check")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((self.state() / "last-successful").read_text().strip(), SHA)
        result = self.run_release(action="rollback")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.state() / "last-successful").read_text().strip(), SHA)

    def test_successful_release_saves_the_previous_commit(self):
        self.assertEqual(self.run_release().returncode, 0)
        result = self.run_release(sha=NEXT_SHA)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.state() / "last-successful").read_text().strip(), NEXT_SHA)
        self.assertEqual((self.state() / "previous-successful").read_text().strip(), SHA)

    def test_bad_environment_or_sha_is_rejected_without_docker(self):
        for env, sha in (("other", SHA), ("staging", "main")):
            self.assertNotEqual(self.run_release(environment=env, sha=sha).returncode, 0)
        self.assertEqual(self.events(), [])


if __name__ == "__main__":
    unittest.main()
