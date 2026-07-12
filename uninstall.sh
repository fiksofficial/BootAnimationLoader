#!/system/bin/sh

MODPATH="${0%/*}"

rm -rf "${MODPATH}/tmp"
rm -f  "${MODPATH}/module.log"
rm -f  "${MODPATH}/.lock"
