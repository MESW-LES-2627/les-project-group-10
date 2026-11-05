FROM docker:29-cli AS docker-cli

FROM ghcr.io/actions/actions-runner:latest
USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl git python3 util-linux \
    && rm -rf /var/lib/apt/lists/*
COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker-cli /usr/local/libexec/docker/cli-plugins/ /usr/local/lib/docker/cli-plugins/
ENV RUNNER_ALLOW_RUNASROOT=1
WORKDIR /home/runner
ENTRYPOINT ["/home/runner/run.sh"]
