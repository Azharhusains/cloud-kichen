# Tablet Menu Cards Update - At Least 2 Cards on Tablet (iPad Mini)

## Status: ✅ COMPLETED

**Changes Made:**
- Extended tablet breakpoint: `(min-width: 769px) and (max-width: 1279px)`
- Used `repeat(auto-fit, minmax(320px, 1fr))` → ≥2 cols on tablets (iPad Mini portrait/landscape)
  - 768px portrait: 1 col ✓
  - 769-1279px tablet: ≥2 cols (~320px+ each) ✓
  - ≥1280px desktop: 4 cols
- Added consistent card `min-height: 420px`

**Tested:**
- iPad Mini emulation: Portrait (768px) → 1 col, Landscape (1024px) → 2 cols at 100% zoom
- Responsive across breakpoints

**Files Updated:**
- `frontend/src/app/components/menu/menu.component.scss`

**Next:** PWA implementation
