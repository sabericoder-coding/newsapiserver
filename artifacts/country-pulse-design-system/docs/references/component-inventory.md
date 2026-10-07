# Country Pulse component inventory

Source: the existing Expo app at `artifacts/country-pulse/app/index.tsx`.
The app defines two standalone reusable visual families. Screen-level layout,
search, loading, and empty-state compositions remain outside this component
catalog.

| Family | Reference | Dependencies / behavior | Importance evidence | Chunk | Status |
| --- | --- | --- | --- | --- | --- |
| CountryChip | `components/country-chip.md` | Flag image/fallback, selected state, press callback | Reused across the country rail; primary way to choose a briefing | Pilot | Implemented |
| NewsCard | `components/news-card.md` | Publisher, relative age, title, open callback | Repeated for each result in the briefing list | Pilot | Implemented |

The first chunk contains the full source component set (2 families). There are no
remaining chunks.
