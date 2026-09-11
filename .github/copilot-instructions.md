# Living Fog coding instructions

Read and follow `AGENTS.md` before making changes.

This is a Foundry VTT v14 visual-only fog module. Preserve Foundry LOS, walls, token visibility, and fog exploration. Hidden map pixels must never bleed through the custom fog material. Prefer small dependency-free changes and fail closed when Foundry shader internals do not match the expected layout.
