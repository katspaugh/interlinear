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
`U+1E00–1E9F` (ṃ ṭ ḷ ḍ ṅ ṇ) as well as `U+0100–017F` (ā ī ū). The
`unicode-range` declarations in `theme-sutta.css` are Google's, kept verbatim
so a browser fetches only the file it needs.

Neither family actually draws the dotted letters, though — Google's files
leave ṃ ṁ ṭ ḍ ṇ ṅ ḷ (and ṛ ṣ ḥ, plus capitals) to a fallback font. So the
three `latin-ext` files here are not Google's: `web/scripts/build-fonts.py`
rebuilds them from the upstream variable TTFs, adding each letter as a
composite of the font's own base letter and dot, placed by its mark anchors
at every weight and optical size.

Both families are licensed under the SIL Open Font License 1.1:
<https://fonts.google.com/specimen/Newsreader/license> ·
<https://fonts.google.com/specimen/Sora/license>

To refresh the `latin` files, request the CSS with a modern browser `User-Agent` and
download the `woff2` files it points at:

    https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..400&family=Sora:wght@400..600&display=swap

To refresh the `latin-ext` files, download the TTFs from
<https://github.com/google/fonts> (`ofl/newsreader/Newsreader[opsz,wght].ttf`,
`ofl/newsreader/Newsreader-Italic[opsz,wght].ttf`, `ofl/sora/Sora[wght].ttf`)
into one folder and run:

    pip install fonttools brotli
    python3 web/scripts/build-fonts.py <that folder>
