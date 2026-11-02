# pieco-fleet-worker: the church's one fat fffleet worker for the operator PC and the assisting PC.
#
# It is the published LCYT fat worker (stock fffleet worker with ffmpeg, Chromium, the `dsk` executor and the
# `perception` executor) plus what the Pi ecosystem adds on top:
#   - yt-dlp and fffleet's built-in `download` executor (type:download, used by Saarnavideo),
#   - PulseAudio with a virtual sound card ("pieco"), so a browser that plays sound can be captured next to the
#     picture,
#   - the `pieco-page` executor (type:page, executors/pieco-page): open any web page in Chromium and publish it, with
#     its sound if asked, to any RTSP or RTMP server such as MediaMTX. This is the live route.
#
# Built by .github/workflows/fat-worker.yml (manual dispatch) as ghcr.io/<owner>/pieco-fleet-worker (CPU) and
# ghcr.io/<owner>/pieco-fleet-worker-gpu (same image with GPU=1 PAGE_ENCODER=nvenc: NVENC is the default encoder
# of the page executor and the build fails if this image's ffmpeg has no h264_nvenc).
# Local build:  docker build -f docker/fat-worker/Dockerfile -t pieco-fleet-worker docker/fat-worker
#               docker build -f docker/fat-worker/Dockerfile --build-arg GPU=1 --build-arg PAGE_ENCODER=nvenc \
#                 -t pieco-fleet-worker-gpu docker/fat-worker
ARG BASE_TAG=latest
FROM ghcr.io/jsilvanus/lcyt-fleet-worker:${BASE_TAG}

ARG GPU=0
ARG PAGE_ENCODER=x264

USER root
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip pulseaudio pulseaudio-utils \
  && python3 -m pip install --break-system-packages yt-dlp \
  && rm -rf /var/lib/apt/lists/* \
  && yt-dlp --version \
  && pulseaudio --version

COPY docker-entrypoint.sh /usr/local/bin/pieco-entrypoint
RUN chmod 0755 /usr/local/bin/pieco-entrypoint

# The page executor goes next to the base image's executors, so it finds playwright-core in /opt/lcyt/node_modules,
# and is linked into /app/node_modules because the worker imports executors from /app (ESM ignores NODE_PATH).
COPY executors/pieco-page/ /opt/lcyt/node_modules/pieco-page/
RUN ln -s /opt/lcyt/node_modules/pieco-page /app/node_modules/pieco-page \
  && cd /app/packages/fffleet-worker/bin \
  && node --input-type=module -e "import.meta.resolve('pieco-page/fffleet-executor');" \
  && cd /opt/lcyt/node_modules/pieco-page && node --input-type=module -e "await import('playwright-core')"

# Keep the base image's executors and add fffleet's generic download executor (present in fffleet 2.4 and later).
# Fail the build, not the container, when the download executor is missing from the base image.
RUN test -f /app/packages/fffleet-worker/src/executors/download.js
# GPU variant: the container must be started with the NVIDIA runtime (compose: a gpu device reservation with the
# video capability). Without a GPU the encoder fails at job start, so only use this image on a GPU host.
RUN if [ "$GPU" = "1" ]; then ffmpeg -hide_banner -encoders | grep -q h264_nvenc \
      || { echo "GPU=1 but this image's ffmpeg has no h264_nvenc" >&2; exit 1; }; fi
ENV PIECO_PAGE_ENCODER=${PAGE_ENCODER} \
    NVIDIA_DRIVER_CAPABILITIES=compute,video,utility
ENV FFFLEET_EXECUTORS=${FFFLEET_EXECUTORS},/app/packages/fffleet-worker/src/executors/download.js,pieco-page/fffleet-executor \
    PIECO_AUDIO=1 \
    PIECO_SINK=pieco \
    XDG_RUNTIME_DIR=/tmp/pieco-runtime

USER node
WORKDIR /app
# Redefining ENTRYPOINT clears the base image's CMD, so it is repeated here.
ENTRYPOINT ["/usr/local/bin/pieco-entrypoint"]
CMD ["node", "packages/fffleet-worker/bin/fffleet-worker.js"]
