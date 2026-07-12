# BootAnimation Loader

[Rus](README_ru.md) | Eng

Systemless boot animation installer with a WebUI dashboard for Magisk, KernelSU, and APatch.

## Features

- Install custom `bootanimation.zip` files systemlessly
- WebUI dashboard with Material You design
- Built-in file browser — no root file manager needed
- Auto-detect boot animation path on 11 known locations
- View current animation properties (resolution, FPS, parts, size)
- One-tap delete to restore stock animation
- Real-time debug log viewer
- 13 languages with manual language selector
- OTA-safe: no system partition modifications

## Requirements

| Root Manager | Minimum Version |
|---|---|
| Magisk | 20.0+ |
| KernelSU | 10640+ (built-in WebUI) |
| APatch | 10000+ |

Additionally one of:
- [KSUWebUI](https://github.com/nicorapelas/ksuwebui) (for KernelSU < 10640)
- [MMRL](https://github.com/nicorapelas/MMRL) (alternative WebUI launcher)

## Installation

1. Download `BootAnimationLoader.zip` from [Releases](https://github.com/fiksofficial/BootAnimationLoader/releases/latest)
2. Open your root manager (Magisk / KernelSU / APatch)
3. Go to Modules → Install from storage
4. Select the downloaded zip
5. Reboot

## Usage

1. Open the module in your root manager and press **Action** (or use KSUWebUI / MMRL)
2. Browse and select a `bootanimation.zip` file from your device
3. Review the validation info (resolution, FPS, parts)
4. Press **Install**
5. Reboot to apply

## Supported Paths

The module auto-detects your device's boot animation location:

| Path | Devices |
|---|---|
| `/apex/com.android.bootanimation/etc/bootanimation.zip` | Android 12+ (APEX) |
| `/product/media/bootanimation.zip` | Most modern devices |
| `/system/media/bootanimation.zip` | Legacy / AOSP |
| `/system/product/media/bootanimation.zip` | Pixel, custom ROMs |
| `/system_ext/media/bootanimation.zip` | Android 11+ |
| `/oem/media/bootanimation.zip` | OnePlus, some OEMs |
| `/data/local/bootanimation.zip` | Some custom ROMs |
| `/system/media/theme/bootanimation.zip` | MIUI, HyperOS |
| `/custom/media/bootanimation.zip` | Samsung, some OEMs |
| `/system/etc/media/bootanimation.zip` | Some MTK devices |
| `/data/cust/media/bootanimation.zip` | EMUI, some Huawei |

## Languages

English, Русский, Українська, Deutsch, Français, Español, Português, Italiano, Türkçe, Polski, 中文, 日本語, 한국어

## How It Works

1. **Install**: module detects the real boot animation path via `readlink -f`, saves it to `config.txt`, and copies your zip to the Magisk overlay directory (`MODPATH/<path>`)
2. **Boot**: Magisk/KernelSU magic mount overlays the module directory over `/system`, so your custom animation appears without modifying the real partition
3. **Delete**: removes the file from the overlay, reverting to stock on next boot

## License

GPL-3.0 license
