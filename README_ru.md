# BootAnimation Loader

Rus | [Eng](README.md)

Системный установщик загрузочной анимации с WebUI-панелью для Magisk, KernelSU и APatch.

## Возможности

- Установка пользовательских `bootanimation.zip` без модификации системного раздела
- WebUI-панель управления с дизайном Material You
- Встроенный файловый браузер — не нужен файловый менеджер с root-доступом
- Автоопределение пути загрузочной анимации из 11 известных расположений
- Просвойство текущей анимации (разрешение, FPS, части, размер)
- Удаление кастомной анимации одним нажатием — восстанавливается заводская
- Отладочный лог в реальном времени
- 13 языков с ручным выбором
- Безопасно для OTA-обновлений: системный раздел не изменяется

## Требования

| Root-менеджер | Минимальная версия |
|---|---|
| Magisk | 20.0+ |
| KernelSU | 10640+ (встроенный WebUI) |
| APatch | 10000+ |

Также потребуется одно из:
- [KSUWebUI](https://github.com/nicorapelas/ksuwebui) (для KernelSU < 10640)
- [MMRL](https://github.com/nicorapelas/MMRL) (альтернативный лаунчер WebUI)

## Установка

1. Скачайте `BootAnimationLoader.zip` из [Releases](https://github.com/fiksofficial/BootAnimationLoader/releases/latest)
2. Откройте ваш root-менеджер (Magisk / KernelSU / APatch)
3. Перейдите в Модули → Установить из хранилища
4. Выберите скачанный zip
5. Перезагрузите устройство

## Использование

1. Откройте модуль в root-менеджере и нажмите **Action** (или используйте KSUWebUI / MMRL)
2. Найдите и выберите файл `bootanimation.zip` на устройстве
3. Проверьте информацию (разрешение, FPS, части)
4. Нажмите **Установить**
5. Перезагрузите устройство

## Поддерживаемые пути

Модуль автоматически определяет расположение загрузочной анимации:

| Путь | Устройства |
|---|---|
| `/apex/com.android.bootanimation/etc/bootanimation.zip` | Android 12+ (APEX) |
| `/product/media/bootanimation.zip` | Большинство современных устройств |
| `/system/media/bootanimation.zip` | Старые / AOSP |
| `/system/product/media/bootanimation.zip` | Pixel, кастомные прошивки |
| `/system_ext/media/bootanimation.zip` | Android 11+ |
| `/oem/media/bootanimation.zip` | OnePlus, некоторые OEM |
| `/data/local/bootanimation.zip` | Некоторые кастомные прошивки |
| `/system/media/theme/bootanimation.zip` | MIUI, HyperOS |
| `/custom/media/bootanimation.zip` | Samsung, некоторые OEM |
| `/system/etc/media/bootanimation.zip` | Некоторые MTK-устройства |
| `/data/cust/media/bootanimation.zip` | EMUI, некоторые Huawei |

## Языки

English, Русский, Українська, Deutsch, Français, Español, Português, Italiano, Türkçe, Polski, 中文, 日本語, 한국어

## Как это работает

1. **Установка**: модуль определяет реальный путь загрузочной анимации через `readlink -f`, сохраняет его в `config.txt`, и копирует ваш zip в директорию магического монтирования Magisk (`MODPATH/<путь>`)
2. **Загрузка**: Magisk/KernelSU накладывает директорию модуля поверх `/system`, поэтому кастомная анимация появляется без изменения реального раздела
3. **Удаление**: удаляет файл из оверлея, восстанавливая заводскую анимацию при следующей загрузке

## Лицензия

GPL-3.0 license
