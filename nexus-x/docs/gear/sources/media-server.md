# Media Server Sources

## Overview

Dedicated playback and graphics systems for video content delivery. Includes show control servers, graphics engines, and video playback systems.

## Role in Signal Flow

- **Position**: SOURCE (originates signal)
- **Direction**: Output only (may have preview inputs)
- **Signal Color**: Typically unique color per server/output group

## Common Systems

| System | Manufacturer | Typical Use |
|--------|--------------|-------------|
| Disguise | Disguise | Large-scale projection, LED walls |
| Hippotizer | Green Hippo | Concert touring, theatre |
| Watchout | Dataton | Multi-display, projection mapping |
| Resolume | Resolume | VJ, live visuals |
| PlaybackPro | DT Videolabs | Corporate presentations |
| PVP | Renewed Vision | House of worship |
| ProPresenter | Renewed Vision | House of worship, lyrics |
| QLAB | Figure 53 | Theatre, cues |
| Millumin | Anomes | Projection mapping |
| TouchDesigner | Derivative | Generative, interactive |

## Common Output Configurations

| Output Type | Resolution | Refresh | Notes |
|-------------|------------|---------|-------|
| DisplayPort | 3840x2160 | 60Hz | Per GPU output |
| HDMI | 3840x2160 | 60Hz | Consumer displays |
| SDI (via card) | 1920x1080 | 59.94 | Broadcast integration |
| NDI | Various | Various | Network distribution |

## Decision Rules

**Use Media Server node when:**
- Pre-programmed video playback
- Multiple synchronized outputs
- Show control triggers (timecode, MIDI, OSC)
- Large-scale video walls or projection
- Generative/real-time graphics

**Media Server vs. Laptop:**
- Media Server = dedicated playback, show control, multiple outputs
- Laptop = presentation software, single output, ad-hoc

## Output Configurations

**Single Server, Multiple Outputs:**
```
Media Server
├── OUT 1 (Main) → Projector 1
├── OUT 2 (Main) → Projector 2
├── OUT 3 (Preview) → Confidence Monitor
└── OUT 4 (GUI) → Operator Display
```

**Typical I/O Cards:**
| Card | Outputs | Resolution |
|------|---------|------------|
| Nvidia Quadro | 4x DP | 4K60 each |
| AJA Corvid | 4x SDI | 4K60 or 4x HD |
| Blackmagic DeckLink Quad | 4x SDI | HD |
| Datapath | 4x DP | 4K60 |

## Show Control Integration

| Protocol | Use Case |
|----------|----------|
| Timecode (LTC/MTC) | Sync to audio/video master |
| MIDI | Cue triggers, transport |
| OSC | Modern show control |
| Art-Net/sACN | Lighting integration |
| GPI/GPO | Hard contact triggers |

## Gotchas

1. **Genlock** - Media servers should be genlocked to house sync for clean integration with cameras/switchers.

2. **Output Mapping** - Physical output numbering may not match software. Document mapping.

3. **Backup/Redundancy** - Critical shows need backup server with automatic failover.

4. **Content Formats** - Match codec, resolution, frame rate to output. HAP codec for real-time.

5. **Latency** - Software rendering adds latency. Account for in lip-sync scenarios.

6. **Preview vs Program** - Some servers have preview outputs that show next cue, not current.

7. **GPU Load** - Monitor GPU utilization. Content exceeding capacity causes dropped frames.
