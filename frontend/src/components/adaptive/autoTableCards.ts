import { useEffect } from 'react';

/**
 * Phone fallback for tables that have not been moved to <ResponsiveTable> yet.
 *
 * Copies each column's header text onto its body cells as `data-label`, so the CSS in
 * adaptive.css (`html[data-device='mobile'] .data-table:has(> thead)`) can lay every row out as a
 * card: first cell = title, the rest = "Label · value" lines. Only attributes React never sets
 * are written, so React's own updates are unaffected. Tables without a <thead> (key/value
 * detail tables) are left as they are.
 */
export function useAutoTableCards(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const run = () => { frame = 0; document.querySelectorAll<HTMLTableElement>('table.data-table').forEach(labelTable); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(run); };

    run();
    // Tables render later (data loads, tabs, sheets in portals), so watch the whole body.
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => { observer.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, [enabled]);
}

function labelTable(table: HTMLTableElement) {
  const head = table.tHead?.rows[0];
  if (!head) return;
  // Header text per column index, honouring colSpan.
  const labels: string[] = [];
  Array.from(head.cells).forEach((th) => {
    const text = (th.textContent || '').trim();
    for (let i = 0; i < (th.colSpan || 1); i++) labels.push(text);
  });
  Array.from(table.tBodies).forEach((body) => {
    Array.from(body.rows).forEach((row) => {
      let col = 0;
      Array.from(row.cells).forEach((cell) => {
        const span = cell.colSpan || 1;
        const label = span > 1 ? '' : labels[col] ?? '';
        if (cell.getAttribute('data-label') !== label) cell.setAttribute('data-label', label);
        col += span;
      });
    });
  });
}
