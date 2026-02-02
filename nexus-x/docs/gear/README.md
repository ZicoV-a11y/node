# Gear Reference Documentation

This folder contains reference documentation for equipment used in signal flow diagrams.

## Structure

```
docs/gear/
├── README.md           (this file)
├── sources/
│   ├── laptop.md       (computers, workstations)
│   ├── camera.md       (video cameras, PTZ)
│   └── media-server.md (playback servers)
├── processors/
│   └── (future: switchers, scalers, etc.)
└── manufacturers/
    ├── barco.md
    ├── blackmagic.md
    └── analog-way.md
```

## Document Template

Each gear document should include:

1. **Overview** - What is this device category?
2. **Role in Signal Flow** - Where does it sit? Source? Destination? Pass-through?
3. **Common I/O** - Typical input/output configurations
4. **Decision Rules** - When to use this vs. alternatives
5. **Gotchas** - Quirks, limitations, common mistakes

## Cross-Reference

The structured metadata for these docs lives in:
`src/config/gearMetadata.js`

This metadata powers tooltips, help text, and validation in the app.
