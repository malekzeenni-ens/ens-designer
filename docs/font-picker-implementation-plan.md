# Font identity and preview picker

## Outcome
Font choices must distinguish actual styles and show the font name in the selected font file. Equivalent file copies should occupy one library row while saved designs continue to resolve their original content IDs.

## 1. Catalogue identity
- Read preferred family, subfamily and full-name records using fontTools, falling back to the existing filename parser when metadata cannot be read.
- Keep content-derived IDs unchanged. Retain every non-excluded record for generation and file serving; build a separate visible catalogue that consolidates matching embedded full-name/style faces.
- Prefer favourites, then uploads, then project copies, with deterministic ordering. Map duplicate favourite/upload references to the visible representative and deduplicate their lists.
- Keep style variants distinct. Preserve filename aliases for search and existing recommendation/structural-score lookup.
- Hide all copies of a consolidated face when a user removes it, without deleting font files.
- Use the same metadata reader for upload duplicate detection and catalogue insertion.

## 2. Presentation
- Include the style in display labels when the full name omits it. Preserve distinct outline, slant, bold and italic faces.
- Introduce a reusable FontPicker for base font, line font and favourite selection.
- Render each name with its exact content-ID font URL. Keep style, category and suitability score in the normal interface font.
- Use a portalled popover so inspector scrolling cannot clip it. Constrain it to the viewport and support both appearance themes.
- Retain groups, favourites and filters. Add search within the picker, including filename aliases. Filtering must not silently change the chosen design font.

## 3. Loading and accessibility
- Load preview faces on intersection with the scroll viewport; reuse loaded faces across pickers, limit the cache, and handle failed downloads with a visible fallback status.
- Support arrows, Home/End, Enter, Escape, Tab, outside-click dismissal, selected-state announcements and focus restoration. Keep the selected option visible on opening.
- Show the font name once, in its own font, with an accessible text label. Keep a preview-failure status when loading fails.

## 4. Verification
- Backend regressions: embedded names, style variants, deterministic duplicate selection, favourites/uploads, saved IDs, removal, upload duplicate detection and filename fallback.
- Frontend regressions: style labels, search, empty results, selection without incidental changes, keyboard navigation, lazy FontFace loading and failure handling.
- Run the frontend suite and production build, focused backend tests followed by the existing backend suite where feasible.
- Inspect the running picker in Bright and Dark modes, including narrow viewport positioning and scrolling.

## Constraints
No font files are deleted and no content IDs are rewritten. Changes to catalogue metadata must preserve legacy recommendation aliases. Invalid font metadata must not stop catalogue startup. Preview failures must not prevent font selection or generation.

## Implementation and verification
- Implemented the catalogue, shared preview cache, picker, base/line/favourite integration and regression coverage described above.
- Local library audit: 1,651 unique file IDs remain addressable, 1,102 visible faces, 32 favourites, zero repeated display labels. Contingent Serif Regular/Bold/Slant/Bold Slant and Sagitha Serif Regular/Italic remain separate; OTF/TTF copies consolidate.
- Backend suite: 215 tests passed. After the final metadata-reader and alias adjustments, 22 focused font-management, upload and generation tests passed.
- Frontend suite: 63 tests passed; production TypeScript/Vite build passed.
- Visual verification remains outstanding: the browser access host was unavailable, and native browser automation stopped because it could not establish the current URL. No Bright/Dark or narrow-viewport visual pass is claimed.
