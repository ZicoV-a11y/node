# Camera Sources

## Overview

Video cameras used for live capture. Includes broadcast cameras, PTZ cameras, camcorders, and specialty cameras (POV, robotic).

## Role in Signal Flow

- **Position**: SOURCE (originates signal)
- **Direction**: Output only
- **Signal Color**: Typically GREEN (emerald) or unique color per camera

## Common Output Configurations

| Camera Type | Output | Resolution | Refresh | Notes |
|-------------|--------|------------|---------|-------|
| Broadcast | 12G SDI | 3840x2160 | 59.94 | 4K single link |
| Broadcast | 3G SDI | 1920x1080 | 59.94 | HD standard |
| PTZ | HDMI/SDI | 1920x1080 | 59.94 | Often both outputs |
| PTZ | NDI | 1920x1080 | 59.94 | Network video |
| Webcam | USB | 1920x1080 | 30 | Consumer grade |
| POV/Action | HDMI | 1920x1080 | 60 | Clean HDMI out |

## Decision Rules

**Use Camera node when:**
- Live video capture from physical camera
- IMAG (image magnification) for live events
- Recording/streaming source
- PTZ for remote operation

**Camera vs. Laptop:**
- Camera = real-world capture
- Laptop = computer-generated content

## PTZ Cameras

Power-Tilt-Zoom cameras with remote control:

| Control | Protocol | Notes |
|---------|----------|-------|
| VISCA | RS-422/IP | Sony standard, widely supported |
| NDI | IP | PTZOptics, BirdDog |
| Pelco-D | RS-485 | Security cameras |

## Signal Types

**SDI Variants:**
- SD-SDI: 480i/576i (legacy)
- HD-SDI (1.5G): 720p, 1080i
- 3G-SDI: 1080p60
- 6G-SDI: 4K30
- 12G-SDI: 4K60 (single link)
- Quad-Link 3G: 4K60 (4 cables)

## Gotchas

1. **Genlock** - Cameras should be genlocked for clean switching. Feed black burst or tri-level sync.

2. **Tally** - Connect tally for on-air indication. Usually parallel or GPI.

3. **Return Video** - Camera operators may need program return or multiview.

4. **Iris/Exposure** - Auto modes can cause issues during switching. Consider manual.

5. **Frame Rate Matching** - All cameras in a system should match frame rate (e.g., all 59.94).

6. **Cable Length** - SDI max distances:
   - 3G-SDI: ~100m
   - 12G-SDI: ~50m
   - Use fiber for longer runs
