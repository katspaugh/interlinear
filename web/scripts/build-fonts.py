"""Rebuild the latin-ext font subsets with the Pali letters added.

Neither Newsreader nor Sora draws the dotted letters romanized Pali needs
(ṃ ṁ ṭ ḍ ṇ ṅ ḷ and their capitals), so browsers set them in a fallback face.
This adds each one as a composite glyph — the font's own base letter plus its
own combining dot — positioned by the font's mark anchors (Newsreader) or
centred on the letter (Sora, which has no anchors for these). Positions are
computed at every master, so the dot stays put across weight and optical
size. Then it cuts the latin-ext subset the CSS points at.

    pip install fonttools brotli
    python3 web/scripts/build-fonts.py <dir with the upstream TTFs>

The upstream TTFs are the variable fonts from github.com/google/fonts
(ofl/newsreader/Newsreader[opsz,wght].ttf, Newsreader-Italic[opsz,wght].ttf,
ofl/sora/Sora[wght].ttf).
"""

import sys
from pathlib import Path

from fontTools import subset
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import otTables
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphComponent
from fontTools.ttLib.tables.TupleVariation import TupleVariation
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.varLib.models import VariationModel
from fontTools.varLib.varStore import VarStoreInstancer

OUT = Path(__file__).resolve().parent.parent / 'public' / 'fonts'

# Google Fonts' latin-ext unicode-range, as in theme-sutta.css.
LATIN_EXT = (
    '0100-02BA 02BD-02C5 02C7-02CC 02CE-02D7 02DD-02FF 0304 0308 0329 '
    '1D00-1DBF 1E00-1E9F 1EF2-1EFF 2020 20A0-20AB 20AD-20C0 2113 2C60-2C7F '
    'A720-A7FF'
)

# codepoint: (base glyph, 'above' | 'below'). Pali, plus the Sanskrit letters
# that turn up in etymologies.
LETTERS = {
    0x1E43: ('m', 'below'), 0x1E42: ('M', 'below'),  # ṃ Ṃ
    0x1E41: ('m', 'above'), 0x1E40: ('M', 'above'),  # ṁ Ṁ
    0x1E6D: ('t', 'below'), 0x1E6C: ('T', 'below'),  # ṭ Ṭ
    0x1E0D: ('d', 'below'), 0x1E0C: ('D', 'below'),  # ḍ Ḍ
    0x1E47: ('n', 'below'), 0x1E46: ('N', 'below'),  # ṇ Ṇ
    0x1E45: ('n', 'above'), 0x1E44: ('N', 'above'),  # ṅ Ṅ
    0x1E37: ('l', 'below'), 0x1E36: ('L', 'below'),  # ḷ Ḷ
    0x1E5B: ('r', 'below'), 0x1E5A: ('R', 'below'),  # ṛ Ṛ
    0x1E63: ('s', 'below'), 0x1E62: ('S', 'below'),  # ṣ Ṣ
    0x1E25: ('h', 'below'), 0x1E24: ('H', 'below'),  # ḥ Ḥ
}

FONTS = [
    ('Newsreader[opsz,wght].ttf', 'newsreader-latin-ext.woff2', None),
    ('Newsreader-Italic[opsz,wght].ttf', 'newsreader-italic-latin-ext.woff2', None),
    # Google serves Sora's weight axis from 400; keep the file that size.
    ('Sora[wght].ttf', 'sora-latin-ext.woff2', {'wght': (400, 800)}),
]


def mark_for(font, base, where):
    glyphs = set(font.getGlyphOrder())
    if where == 'below':
        return 'dotbelowcomb' if 'dotbelowcomb' in glyphs else 'uni0307'
    if base.isupper() and 'uni0307.case' in glyphs:
        return 'uni0307.case'
    return 'uni0307'


def mark_base_anchors(font, base, mark):
    """The (base anchor, mark anchor) pair the font's `mark` feature uses."""
    for lookup in font['GPOS'].table.LookupList.Lookup:
        for st in lookup.SubTable:
            if lookup.LookupType == 9:
                st = st.ExtSubTable
            if st.LookupType != 4:
                continue
            marks, bases = st.MarkCoverage.glyphs, st.BaseCoverage.glyphs
            if mark in marks and base in bases:
                rec = st.MarkArray.MarkRecord[marks.index(mark)]
                base_anchor = st.BaseArray.BaseRecord[bases.index(base)].BaseAnchor[rec.Class]
                if base_anchor is not None:
                    return base_anchor, rec.MarkAnchor
    return None


def anchor_at(anchor, varstore):
    def coord(value, device):
        if device is None or varstore is None or device.DeltaFormat != 0x8000:
            return value
        return value + varstore[(device.StartSize << 16) + device.EndSize]

    return (
        coord(anchor.XCoordinate, getattr(anchor, 'XDeviceTable', None)),
        coord(anchor.YCoordinate, getattr(anchor, 'YDeviceTable', None)),
    )


def bounds(glyphset, name):
    pen = BoundsPen(glyphset)
    glyphset[name].draw(pen)
    return pen.bounds


def master_locations(font, names):
    """Every normalized location the inputs vary at, default first."""
    locs = {()}
    for name in names:
        for var in font['gvar'].variations.get(name, []):
            locs.add(tuple(sorted((a, peak) for a, (_, peak, _) in var.axes.items() if peak)))
    gdef = font['GDEF'].table
    if getattr(gdef, 'VarStore', None):
        axes = [a.axisTag for a in font['fvar'].axes]
        for region in gdef.VarStore.VarRegionList.Region:
            locs.add(tuple(sorted(
                (axes[i], r.PeakCoord) for i, r in enumerate(region.VarRegionAxis) if r.PeakCoord
            )))
    return [dict(loc) for loc in sorted(locs, key=len)]


def dot_offset(font, base, mark, where, loc, below_dy):
    """Where the mark component goes at normalized location `loc`."""
    glyphset = font.getGlyphSet(location=loc, normalized=True)
    # A dot above standing in for a missing dot below has no anchors to use.
    borrowed = where == 'below' and mark != 'dotbelowcomb'
    anchors = None if borrowed else mark_base_anchors(font, base, mark)
    if anchors:
        gdef = font['GDEF'].table
        store = getattr(gdef, 'VarStore', None)
        inst = VarStoreInstancer(store, font['fvar'].axes, loc) if store else None
        (bx, by), (mx, my) = anchor_at(anchors[0], inst), anchor_at(anchors[1], inst)
        return bx - mx, by - my, glyphset[base].width
    # No anchors: centre the dot on the letter; below, mirror the gap the
    # dot keeps above an x-height letter.
    bxmin, _, bxmax, _ = bounds(glyphset, base)
    mxmin, _, mxmax, _ = bounds(glyphset, mark)
    dx = (bxmin + bxmax) / 2 - (mxmin + mxmax) / 2
    return dx, below_dy if where == 'below' else 0, glyphset[base].width


def add_letters(font):
    glyf, gvar, hmtx = font['glyf'], font['gvar'], font['hmtx']
    order = list(font.getGlyphOrder())
    cmap = font.getBestCmap()

    # For fonts without a dot below: drop the dot above as far under the
    # baseline as it sits above the x-height (measured at the default).
    default = font.getGlyphSet()
    _, dot_bottom, _, dot_top = bounds(default, 'uni0307')
    gap = dot_bottom - font['OS/2'].sxHeight
    below_dy = -gap - dot_top

    # Component flags as the font's own dotted letters use them.
    model_glyph = glyf[cmap[ord('ż')]]
    base_flags, mark_flags = (c.flags for c in model_glyph.components)

    hvar = font['HVAR'].table if 'HVAR' in font else None
    if hvar is not None and hvar.AdvWidthMap is None:
        # Implicit mapping (glyph id -> inner index); make it explicit so
        # the new glyphs can borrow their base letter's advance variation.
        hvar.AdvWidthMap = otTables.AdvWidthMap()
        hvar.AdvWidthMap.mapping = {g: i for i, g in enumerate(order)}

    added = {}
    for cp, (base, where) in LETTERS.items():
        if cp in cmap:
            continue
        mark = mark_for(font, base, where)
        name = f'uni{cp:04X}'
        locs = master_locations(font, [base, mark])
        values = []
        for loc in locs:
            dx, dy, adv = dot_offset(font, base, mark, where, loc, below_dy)
            values.append((round(dx), round(dy), adv))

        glyph = Glyph()
        glyph.numberOfContours = -1
        glyph.components = []
        for comp_name, (x, y), flags in [
            (base, (0, 0), base_flags),
            (mark, values[0][:2], mark_flags),
        ]:
            comp = GlyphComponent()
            comp.glyphName, comp.x, comp.y, comp.flags = comp_name, x, y, flags
            glyph.components.append(comp)
        glyf[name] = glyph
        glyph.recalcBounds(glyf)
        hmtx[name] = (hmtx[base][0], glyph.xMin)

        model = VariationModel(locs, axisOrder=[a.axisTag for a in font['fvar'].axes])
        # gvar points of a composite: one per component, then 4 phantoms.
        points = [
            [(0, 0), (dx, dy), (0, 0), (adv, 0), (0, 0), (0, 0)]
            for dx, dy, adv in values
        ]
        flat = [[c for pt in p for c in pt] for p in points]
        per_coord = [model.getDeltas([f[i] for f in flat], round=round) for i in range(len(flat[0]))]
        variations = []
        for support, delta in zip(model.supports, zip(*per_coord)):
            if not support or not any(delta):
                continue
            coords = [(delta[i], delta[i + 1]) for i in range(0, len(delta), 2)]
            variations.append(TupleVariation(support, coords))
        gvar.variations[name] = variations

        if hvar is not None:
            hvar.AdvWidthMap.mapping[name] = hvar.AdvWidthMap.mapping[base]
            for attr in ('LsbMap', 'RsbMap'):
                mapping = getattr(hvar, attr)
                if mapping is not None:
                    mapping.mapping[name] = mapping.mapping[base]
        classes = font['GDEF'].table.GlyphClassDef
        if classes is not None:
            classes.classDefs[name] = 1

        order.append(name)
        added[cp] = name

    font.setGlyphOrder(order)
    glyf.glyphOrder = order
    for table in font['cmap'].tables:
        if table.isUnicode():
            table.cmap.update(added)
    return added


def main(src_dir):
    src_dir = Path(src_dir)
    for src, out, limits in FONTS:
        font = TTFont(src_dir / src)
        if limits:
            font = instantiateVariableFont(font, limits)
        added = add_letters(font)
        options = subset.Options()
        options.layout_features = ['*']
        options.name_IDs = ['*']
        options.hinting = False  # as Google serves them
        subsetter = subset.Subsetter(options)
        unicodes = []
        for r in LATIN_EXT.split():
            lo, _, hi = r.partition('-')
            unicodes.extend(range(int(lo, 16), int(hi or lo, 16) + 1))
        subsetter.populate(unicodes=unicodes)
        subsetter.subset(font)
        font.flavor = 'woff2'
        font.save(OUT / out)
        print(f'{out}: +{"".join(chr(c) for c in sorted(added))}')


if __name__ == '__main__':
    main(sys.argv[1])
