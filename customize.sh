#!/system/bin/sh

mkdir -p "${MODPATH}/tmp"
set_perm_recursive "${MODPATH}/webroot" 0 0 0755 0644

BOOTANIMATION_PATHS="
/apex/com.android.bootanimation/etc/bootanimation.zip
/product/media/bootanimation.zip
/my_product/media/bootanimation/bootanimation.zip
/oem/media/bootanimation.zip
/system/media/bootanimation.zip
/data/local/bootanimation.zip
/system/product/media/bootanimation.zip
/system_ext/media/bootanimation.zip
/system/media/theme/bootanimation.zip
/custom/media/bootanimation.zip
/system/etc/media/bootanimation.zip
/data/cust/media/bootanimation.zip
"

FOUND_PATH=""
for p in $BOOTANIMATION_PATHS; do
  if [ -f "$p" ]; then
    FOUND_PATH=$(readlink -f "$p")
    break
  fi
done

if [ -z "$FOUND_PATH" ]; then
  ui_print "! bootanimation.zip not found"
  ui_print "! Installation impossible"
  abort "! Installation cancelled"
fi

ui_print "- Found: $FOUND_PATH"

echo "$FOUND_PATH" > "${MODPATH}/config.txt"

ui_print "- Config: ${MODPATH}/config.txt"
ui_print "- BootAnimation Loader installed!"
