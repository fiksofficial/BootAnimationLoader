#!/system/bin/sh

MODPATH="${0%/*}"
LOGFILE="${MODPATH}/module.log"
MAX_LOG=100

while [ "$(getprop sys.boot_completed)" != "1" ]; do
  sleep 2
done

if [ -f "$LOGFILE" ]; then
  count=$(wc -l < "$LOGFILE" 2>/dev/null || echo 0)
  if [ "$count" -gt "$MAX_LOG" ]; then
    tail -n "$MAX_LOG" "$LOGFILE" > "${LOGFILE}.tmp" 2>/dev/null
    mv "${LOGFILE}.tmp" "$LOGFILE"
  fi
fi

echo "$(date +'%Y-%m-%d %H:%M:%S') Service started (boot_completed)" >> "$LOGFILE"
