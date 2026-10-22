// Keep this in sync with the home-products and mobile-product-grid breakpoints.
export function homeProductColumns(width) {
  if (width <= 767) return 1;
  if (width <= 1000) return 3;
  return 4;
}
