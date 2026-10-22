# One product per row on mobile

Product grids now display one full-width card per row at viewport widths up to 767px. This covers category/collection product pages, the shop, the homepage product grid, and other shared product grids. Product recommendations show one card per carousel viewport. The new-arrivals carousel keeps its existing scrolling behavior.

Product names wrap at word boundaries when possible. Each original/sale price stays together, avoiding mid-number breaks. Collection grids use two columns at tablet widths from 768px to 1023px and retain their existing desktop layout above that. The homepage product-row count uses the same mobile breakpoint as the CSS.

All earlier features are included: clickable product cards, sign-in before adding to cart, the imported lipgloss-base banner with US flag, and real product purchase counts.

Validation: all 71 automated tests pass and the production build succeeds. CSS cascade checks against the actual compiled stylesheet verify one product column and unbroken prices at 320, 375, 390, 430, 600, 646, and 767px; wider-screen collection layouts are retained at 768, 1024, and 1440px. Homepage breakpoint checks also pass.
