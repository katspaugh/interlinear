# Fonts

Newsreader and Sora, self-hosted so sutta.stream makes no third-party request
for its type (and keeps working offline and behind restrictive networks).

Both are variable fonts, taken from Google Fonts as one `woff2` per subset per
style — the weight axis covers the whole range `theme-sutta.css` uses, so
these six files are the entire type system:

| file                              | family     | style  | subset     |
| --------------------------------- | ---------- | ------ | ---------- |
| `newsreader-latin.woff2`          | Newsreader | roman  | latin      |
| `newsreader-latin-ext.woff2`      | Newsreader | roman  | latin-ext  |
| `newsreader-italic-latin.woff2`   | Newsreader | italic | latin      |
| `newsreader-italic-latin-ext.woff2` | Newsreader | italic | latin-ext |
| `sora-latin.woff2`                | Sora       | roman  | latin      |
| `sora-latin-ext.woff2`            | Sora       | roman  | latin-ext  |

The `latin-ext` subset is not optional here: romanized Pali needs
`U+1E00–1E9F` (ṃ ṭ ḷ ḍ ṅ ṇ) as well as `U+0100–017F` (ā ī ū ñ). The
`unicode-range` declarations in `theme-sutta.css` are Google's, kept verbatim
so a browser fetches only the file it needs.

Both families are licensed under the SIL Open Font License 1.1:
<https://fonts.google.com/specimen/Newsreader/license> ·
<https://fonts.google.com/specimen/Sora/license>

To refresh them, request the CSS with a modern browser `User-Agent` and
download the `woff2` files it points at:

    https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..400&family=Sora:wght@400..600&display=swap
