import React, { memo } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { money } from '@/lib/format';
import { highlightParts } from '@/lib/posSearch';

/** Two-letter monogram for items without a photo, e.g. "Masala Dosa" → "MD". */
export const monogram = (name: string) => name.replace(/\(.*?\)/g, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const isVeg = (p: any) => (p?.dietary || []).includes('VEGETARIAN') || (p?.dietary || []).includes('VEGAN');

interface Props {
  p: any;
  qty: number;
  /** null = stock not tracked */
  stock: number | null;
  color: string;
  showImage: boolean;
  vegMark: boolean;
  /** Keyboard cursor is on this card */
  active: boolean;
  /** Search terms to highlight in the name */
  terms: string[];
  /** Grid position, shown as a 1–9 quick-add hint on the first cards */
  hotkey?: number;
  onAdd: (p: any) => void;
}

/** Menu tile. Memoized: adding one item only re-renders the cards whose props changed. */
export const ProductCard = memo<Props>(({ p, qty, stock, color, showImage, vegMark, active, terms, hotkey, onAdd }) => {
  const soldOut = stock !== null && stock <= 0;
  const hl = terms.length ? highlightParts(p.name, terms) : null;
  return (
    <button
      type="button"
      data-pid={p.id}
      className={`pc${soldOut ? ' disabled' : ''}${qty ? ' in-ticket' : ''}${active ? ' kb-active' : ''}`}
      style={{ ['--c' as any]: color }}
      onClick={() => onAdd(p)}
      // Keep focus where it was, so Enter / shortcuts don't re-trigger the last tapped card
      onMouseDown={(e) => e.preventDefault()}
      tabIndex={-1}
    >
      <div className="pc-media">
        {showImage && p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" decoding="async" /> : <span className="pc-mono">{monogram(p.name)}</span>}
        {vegMark && <span className={`veg-mark${isVeg(p) ? '' : ' nonveg'}`} title={isVeg(p) ? 'Vegetarian' : 'Non-vegetarian'} />}
        {qty > 0 && <span className="pc-qty">{qty}</span>}
        {soldOut && <span className="pc-flag danger">Sold out</span>}
        {!soldOut && stock !== null && <span className="pc-flag">{stock} left</span>}
        {hotkey !== undefined && <kbd className="pc-key">{hotkey}</kbd>}
      </div>
      <div className="pc-body">
        <div className="pc-name">{hl ? <>{hl[0]}<mark>{hl[1]}</mark>{hl[2]}</> : p.name}</div>
        {p.description && <div className="pc-desc">{p.description}</div>}
        <div className="pc-foot">
          <span className="pc-price">{p.isOpenPrice ? 'Open price' : money(p.price)}</span>
          {p.modifierGroups.length > 0 && <span className="pc-opts">Options</span>}
          <span className="pc-add"><IconPlus size={16} /></span>
        </div>
      </div>
    </button>
  );
});
ProductCard.displayName = 'ProductCard';

export default ProductCard;
