# Laptop / Computer Sources

## Overview

Computers used as video/content sources in a production environment. Includes laptops, desktop workstations, and dedicated graphics machines.

## Role in Signal Flow

- **Position**: SOURCE (originates signal)
- **Direction**: Output only (in most cases)
- **Signal Color**: Typically GREEN (emerald) to indicate source

## Common Output Configurations

| Output Type | Resolution | Refresh | Notes |
|-------------|------------|---------|-------|
| HDMI | 1920x1080 | 60Hz | Most common, universal |
| HDMI | 3840x2160 | 60Hz | 4K output |
| USB-C/DP | 3840x2160 | 60Hz | Modern laptops, needs adapter |
| DisplayPort | 3840x2160 | 60Hz | Desktop workstations |

## Decision Rules

**Use a Laptop node when:**
- Content originates from presentation software (PowerPoint, Keynote)
- Running playback software (ProPresenter, PVP)
- Video conferencing source (Zoom, Teams)
- Live graphics/lower thirds

**Consider Media Server instead when:**
- Dedicated playback device (Hippotizer, Disguise)
- Multiple synchronized outputs
- Show control integration required

## Capture Cards

When feeding a laptop INTO a system (recording, streaming):

| Card | Interface | Resolution | Notes |
|------|-----------|------------|-------|
| Blackmagic DeckLink | PCIe | 4K60 | Pro capture |
| Elgato HD60 S+ | USB | 1080p60 | Portable |
| Magewell USB Capture | USB | 4K30 | Reliable |
| AJA Kona | PCIe | 4K60 | Broadcast grade |

## Gotchas

1. **HDCP** - Many laptops output HDCP-protected signal by default. May need to disable or use HDCP-compliant capture.

2. **Extended vs Mirrored** - Ensure display is set to EXTENDED if using presenter view.

3. **Sleep/Screen Saver** - Disable power saving features before show.

4. **Resolution Negotiation** - Laptop may change resolution based on what display reports. Force resolution if needed.

5. **Audio Follows Video** - HDMI carries audio. Ensure audio routing is correct.
