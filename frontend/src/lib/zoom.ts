/**
 * Zoom applied to #root on laptops/desktops (see enterprise.css). Mouse
 * coordinates and getBoundingClientRect() are in screen pixels, while CSS
 * lengths, offsets and scrollLeft/Top inside the app are not — divide
 * screen-pixel distances by this before using them as CSS px.
 */
export const appZoom = (): number => {
  const root = document.getElementById('root');
  return (root && parseFloat(getComputedStyle(root).zoom)) || 1;
};
