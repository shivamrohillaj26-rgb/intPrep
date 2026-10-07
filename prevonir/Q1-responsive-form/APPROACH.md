# Q1 - Responsive Form

## Problem
Style a form with 8 inputs to be responsive:
- Desktop (≥768px): Multi-column grid
- Mobile (<768px): Single column, all full width
- 10px gap between elements
- No position: absolute

## Desktop Layout
| Row | Fields | Columns |
|-----|--------|---------|
| 1 | First name, Last name, Age | 3 equal |
| 2 | Address | Full width |
| 3 | Place of work, Job title | 2 equal |
| 4 | Phone number, Skype | 2 equal |
| 5 | Submit button | Full width |

## Approach: CSS Grid with 6 columns

WHY 6 COLUMNS?
- LCM(2, 3) = 6
- 3-equal-col rows → each field: span 2
- 2-equal-col rows → each field: span 3
- Full width → span 6

## Interview Talking Points
1. Why Grid over Flexbox? Grid = 2D control. Flexbox = 1D (row OR column, not both)
2. Why 6 columns? LCM approach — cleanest way to support both 2-col and 3-col rows
3. Why max-width media query? Used desktop-first approach (could also do mobile-first with min-width)
4. Only file changed: style.css (index.html was read-only)
