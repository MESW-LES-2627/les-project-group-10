# Iteration 2 AI log

## How we used AI

We used AI to write some of the code, draft documentation, and help write and run tests. We used the stories to decide what to build and checked the work through teammate reviews, automated tests, and browser acceptance testing.

## Examples from this iteration

- **Student profiles.** AI helped run the acceptance checks in the browser. One check was that the interests and budget saved during onboarding still appeared after a refresh.
- **Payment history.** AI compared ways to split the booking work. We decided to build checkout recovery first so that student history could reuse its saved payment outcomes and distinguish failed payments from expired ones.
- **Category tests.** AI's local checks missed a failure in CI. PostgreSQL and JavaScript sorted some category names differently. We updated the test to compare two names that sort consistently in both environments, and CI passed. [Test fix](https://github.com/MESW-LES-2627/les-project-group-10/commit/9e7167d2a6d79bc55db65dada94e3f6af68ff799)
