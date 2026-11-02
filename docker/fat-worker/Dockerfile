# pieco-fleet-worker: the church's one fat fffleet worker for the operator PC and the assisting PC.
#
# It is the published LCYT fat worker (stock fffleet worker with ffmpeg, Chromium, the `dsk` executor and the
# `perception` executor) plus what the Pi ecosystem adds on top:
#   - yt-dlp and fffleet's built-in `download` executor (type:download, used by Saarnavideo),
#   - PulseAudio with a virtual sound card ("pieco"), so a browser that plays sound can be captured next to the
#     picture. This is the base for the live route (Chromium page -> ffmpeg -> MediaMTX). The executor that
#     does the capture is not in this image yet.
#
# Built by .github/workflows/fat-worker.yml (manual dispatch) as ghcr.io/<owner>/pieco-fleet-worker.
# Local build:  docker build -f docker/fat-worker/Dockerfile -t pieco-fleet-worker docker/fat-worker
ARG BASE_TAG=latest
FROM ghcr.io/jsilvanus/lcyt-fleet-worker:${BASE_TAG}

USER root
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip pulseaudio pulseaudio-utils \
  && python3 -m pip install --break-system-packages yt-dlp \
  && rm -rf /var/lib/apt/lists/* \
  && yt-dlp --version \
  && pulseaudio --version

COPY docker-entrypoint.sh /usr/local/bin/pieco-entrypoint
RUN chmod 0755 /usr/local/bin/pieco-entrypoint

# Keep the base image's executors and add fffleet's generic download executor (present in fffleet 2.4 and later).
# Fail the build, not the container, when the download executor is missing from the base image.
RUN test -f /app/packages/fffleet-worker/src/executors/download.js
ENV FFFLEET_EXECUTORS=${FFFLEET_EXECUTORS},/app/packages/fffleet-worker/src/executors/download.js \
    PIECO_AUDIO=1 \
    PIECO_SINK=pieco \
    XDG_RUNTIME_DIR=/tmp/pieco-runtime

USER node
WORKDIR /app
# Redefining ENTRYPOINT clears the base image's CMD, so it is repeated here.
ENTRYPOINT ["/usr/local/bin/pieco-entrypoint"]
CMD ["node", "packages/fffleet-worker/bin/fffleet-worker.js"]
