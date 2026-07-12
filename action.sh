#!/system/bin/sh

MODULE_ID="BootAnimationLoader"

launch_ksuwebui() {
    am start -n "io.github.a13e300.ksuwebui/.WebUIActivity" \
        -e id "$MODULE_ID" > /dev/null 2>&1
}

launch_mmrl() {
    am start -n "com.dergoogler.mmrl/.ui.activity.webui.WebUIActivity" \
        -e MOD_ID "$MODULE_ID" > /dev/null 2>&1
}

echo "BootAnimation Loader - opening WebUI..."

if pm list packages 2>/dev/null | grep -q "io.github.a13e300.ksuwebui"; then
    launch_ksuwebui
    echo "Opened via KSUWebUI"
elif pm list packages 2>/dev/null | grep -q "com.dergoogler.mmrl"; then
    launch_mmrl
    echo "Opened via MMRL"
else
    echo ""
    echo "Neither KSUWebUI nor MMRL is installed."
    echo "Install KSUWebUI or MMRL to use WebUI."
    echo ""
    echo "Or open WebUI from KernelSU/APatch manager."
    echo "Built-in WebUI is available in KernelSU v10640+."
fi
