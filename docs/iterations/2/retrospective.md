# Iteration 2 - Retrospective

## What worked well

The [CI and tests we set up in Iteration 1](../1/retrospective.md) made it easier to move quickly and catch mistakes before merging. For example, CI caught two frontend tests that still used the old user format after we added the admin role. [Fix in the admin PR](https://github.com/MESW-LES-2627/les-project-group-10/commit/b63a7d636d3887cb7f7bf042d82decf21605f8d8)

## Do differently

Most of the work started in week two. We still had time to review each other’s PRs and everything worked well, but in Iteration 3, we’ll try starting the first stories in week one so reviews can begin earlier.

## What still puzzles us

GitHub defaults to `main`, so we have to remember to set `develop` as the base for feature PRs. `main` deploys to production and has no branch protection. We could ask the teachers whether we can protect `main` so production changes go through reviewed release PRs.
