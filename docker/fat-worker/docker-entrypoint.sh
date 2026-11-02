#!/bin/sh
# Starts a private PulseAudio with one virtual output ("pieco" by default) and then runs the worker.
# A page that plays sound writes to that sink; ffmpeg can record its monitor (pieco.monitor).
# Set PIECO_AUDIO=0 to skip it. A failure to start PulseAudio is a warning, not a reason to stop the worker:
# renders and downloads do not need it.
set -u

if [ "${PIECO_AUDIO:-1}" != "0" ]; then
  mkdir -p "${XDG_RUNTIME_DIR:-/tmp/pieco-runtime}" && chmod 0700 "${XDG_RUNTIME_DIR:-/tmp/pieco-runtime}"
  if pulseaudio --start --exit-idle-time=-1 --daemonize=yes --disallow-exit \
      --load="module-null-sink sink_name=${PIECO_SINK:-pieco} sink_properties=device.description=${PIECO_SINK:-pieco}" \
      >/dev/null 2>&1; then
    pactl set-default-sink "${PIECO_SINK:-pieco}" >/dev/null 2>&1 || true
  else
    echo "pieco-entrypoint: PulseAudio did not start; sound capture is unavailable" >&2
  fi
fi

exec "$@"
