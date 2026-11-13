import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  IconLayoutDashboard, IconToolsKitchen2, IconListDetails, IconTable, IconCalculator, IconSettings, IconBell,
  IconClipboardCheck, IconClock, IconPlus, IconSearch, IconArrowRight, IconCheck, IconFlame, IconSoup, IconMeat,
  IconPizza, IconEgg, IconSalad, IconBread, IconFish, IconCoffee, IconCake, IconCreditCard, IconCash, IconQrcode,
  IconUsers, IconMinus, IconTrendingUp, IconChefHat, IconPrinter,
} from '@tabler/icons-react';
import { MageWordmark } from '../layout/AppSvgs';

// Product mockups for the landing page, drawn in HTML/CSS so they match the real
// (dark) GMOS console. Each one is laid out at a fixed design width and scaled to
// fit by <Scaled>, so it reads like a screenshot at every viewport size.

/** Lays children out at `width` px and scales them down to fit the available width. */
export const Scaled: React.FC<{ width: number; className?: string; children: React.ReactNode }> = ({ width, className, children }) => {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    const update = () => {
      const s = Math.min(1, o.clientWidth / width);
      setScale(s);
      setHeight(i.offsetHeight * s);
    };
    update();
    if (!('ResizeObserver' in window)) return;
    const ro = new ResizeObserver(update);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div ref={outer} className={`lp-scaled${className ? ` ${className}` : ''}`} style={{ height }} aria-hidden>
      <div ref={inner} style={{ width, transform: `scale(${scale})`, transformOrigin: 'top left', margin: scale === 1 ? '0 auto' : 0 }}>
        {children}
      </div>
    </div>
  );
};

/* ───────────────────────── Dashboard (hero) ───────────────────────── */

type Status = 'ready' | 'cooking' | 'kitchen' | 'done';
const STATUS: Record<Status, [string, string]> = {
  ready: ['Ready', 'Ready to serve'],
  cooking: ['In progress', 'Cooking now'],
  kitchen: ['In progress', 'In the kitchen'],
  done: ['Completed', 'Waiting for payment'],
};

const SIDE = [
  [IconLayoutDashboard, 'Dashboard'], [IconToolsKitchen2, 'Menu'], [IconListDetails, 'Orders'],
  [IconTable, 'Tables'], [IconCalculator, 'Accounting'], [IconSettings, 'Settings'],
] as const;

const ORDERS: { t: string; name: string; items: number; s: Status }[] = [
  { t: 'A4', name: 'Amara Okafor', items: 5, s: 'ready' },
  { t: 'B2', name: 'Daniel Reyes', items: 4, s: 'cooking' },
  { t: 'TA', name: 'Takeaway #214', items: 6, s: 'kitchen' },
  { t: 'TA', name: 'Priya Nair', items: 3, s: 'kitchen' },
  { t: 'A9', name: 'Lucas Moreau', items: 8, s: 'done' },
];

const PAYMENTS: [string, string, number][] = [
  ['A9', 'Sofia Lind', 912], ['C2', 'Kenji Ito', 908], ['A2', 'Hana Park', 904], ['A3', 'Omar Haddad', 903], ['B4', 'Elena Rossi', 897],
];

const DISHES = [
  [IconSoup, 'Truffle Mushroom Risotto', 23], [IconMeat, 'Chicken Tikka Tacos', 16],
  [IconToolsKitchen2, 'Spaghetti Bolognese', 13], [IconPizza, 'Margherita Pizza', 12],
] as const;

const OUT_OF_STOCK = [['Grilled Salmon', '4:00 PM'], ['Lemon Tart', '3:30 PM'], ['Fish & Chips', '4:20 PM']];

const Search: React.FC<{ label: string }> = ({ label }) => (
  <div className="mk-search"><span>{label}</span><IconSearch size={13} /></div>
);

const TableTag: React.FC<{ t: string }> = ({ t }) => <span className={`mk-tag${t === 'TA' ? ' take' : ''}`}>{t}</span>;

export const DashboardMock: React.FC = () => {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="mk mk-dash">
      <aside className="mk-side">
        <div className="mk-logo"><MageWordmark height={24} /></div>
        <nav>
          {SIDE.map(([Icon, label], i) => (
            <div key={label} className={`mk-nav${i === 0 ? ' on' : ''}`}><Icon size={16} />{label}</div>
          ))}
        </nav>
        <div className="mk-user"><span className="mk-avatar">GS</span><div><b>Grace Silva</b><small>Floor manager</small></div></div>
      </aside>

      <div className="mk-main">
        {/* Shown only in the phone layout, where the sidebar is hidden */}
        <div className="mk-mobilebar">
          <MageWordmark height={20} />
          <span><IconBell size={16} /><span className="mk-avatar">GS</span></span>
        </div>
        <header className="mk-head">
          <h4>Service is busy tonight <IconFlame size={18} className="mk-flame" /></h4>
          <span>{today}</span>
        </header>

        <div className="mk-grid">
          <div className="mk-stats">
            <div className="mk-stat hot">
              <div className="mk-stat-top"><span>New orders</span><i><IconBell size={15} /></i></div>
              <strong>16</strong><small>Updated with every new order</small>
            </div>
            <div className="mk-stat">
              <div className="mk-stat-top"><span>Total orders</span><i><IconClipboardCheck size={15} /></i></div>
              <strong>86</strong><small><em>+2.5%</em> vs. last Friday</small>
            </div>
            <div className="mk-stat">
              <div className="mk-stat-top"><span>Waitlist</span><i className="amber"><IconClock size={15} /></i></div>
              <strong>9</strong><small><em>~12 min</em> average wait</small>
            </div>
          </div>

          <section className="mk-panel mk-orders">
            <h5>Order list</h5>
            <Search label="Search an order" />
            {ORDERS.map((o) => (
              <div key={o.name} className="mk-row">
                <TableTag t={o.t} />
                <div className="mk-row-main"><b>{o.name}</b><small>{o.items} items</small></div>
                <div className="mk-row-end">
                  <span className={`mk-badge ${o.s}`}>{o.s === 'ready' ? <IconCheck size={11} stroke={3} /> : o.s === 'done' ? <IconClipboardCheck size={11} /> : <IconClock size={11} />}{STATUS[o.s][0]}</span>
                  <small className={`mk-dot ${o.s}`}>{STATUS[o.s][1]}</small>
                </div>
              </div>
            ))}
          </section>

          <section className="mk-panel mk-pay">
            <h5>Payment</h5>
            <Search label="Search an order" />
            {PAYMENTS.map(([t, name, no]) => (
              <div key={name} className="mk-row">
                <TableTag t={t} />
                <div className="mk-row-main"><b>{name}</b><small>Order #{no}</small></div>
                <span className="mk-paynow">Pay now <IconArrowRight size={11} stroke={2.5} /></span>
              </div>
            ))}
          </section>

          <div className="mk-col">
            <div className="mk-create"><IconPlus size={15} stroke={2.5} /> Create new order</div>
            <section className="mk-panel">
              <div className="mk-panel-head"><h5>Popular dishes</h5><a>View all</a></div>
              <div className="mk-th"><span>Rank</span><span>Name</span></div>
              {DISHES.map(([Icon, name, n], i) => (
                <div key={name} className="mk-dish">
                  <span className="mk-rank">0{i + 1}</span>
                  <span className="mk-food"><Icon size={16} /></span>
                  <div><b>{name}</b><small>Orders: <em>{n}</em></small></div>
                </div>
              ))}
            </section>
            <section className="mk-panel">
              <div className="mk-panel-head"><h5>Out of stock</h5><a>View all</a></div>
              {OUT_OF_STOCK.map(([name, at]) => (
                <div key={name} className="mk-oos"><b>{name}</b><small>Back at: <em>{at}</em></small></div>
              ))}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────── Menu / POS ───────────────────────── */

const MENU_CATS: [string, number][] = [['All menu', 48], ['Breakfast', 12], ['Mains', 18], ['Desserts', 8], ['Drinks', 10]];
const MENU_ITEMS = [
  { icon: IconEgg, name: 'Eggs Benedict', price: 12.5, qty: 1, tag: 'Popular' },
  { icon: IconSalad, name: 'Greek Yogurt Bowl', price: 9, qty: 0 },
  { icon: IconBread, name: 'Avocado Toast', price: 11, qty: 0 },
  { icon: IconFish, name: 'Smoked Salmon Bagel', price: 14, qty: 2 },
  { icon: IconCoffee, name: 'Flat White', price: 4.5, qty: 0, tag: 'Oat +0.5' },
  { icon: IconCake, name: 'Belgian Waffles', price: 10, qty: 0 },
];

export const MenuMock: React.FC<{ withOrder?: boolean }> = ({ withOrder }) => (
  <div className={`mk mk-menu${withOrder ? ' wide' : ''}`}>
    <div className="mk-menu-cats">
      <h5>Choose menu</h5>
      {MENU_CATS.map(([c, n], i) => (
        <div key={c} className={`mk-cat${i === 1 ? ' on' : ''}`}><b>{c}</b><small>{n} items</small></div>
      ))}
    </div>
    <div className="mk-menu-body">
      <Search label="Search the menu" />
      <div className="mk-items">
        {MENU_ITEMS.map(({ icon: Icon, name, price, qty, tag }) => (
          <div key={name} className={`mk-item${qty ? ' picked' : ''}`}>
            <div className="mk-item-art"><Icon size={34} stroke={1.3} />{tag && <span>{tag}</span>}</div>
            <b>{name}</b>
            <div className="mk-item-foot">
              <em>${price.toFixed(2)}</em>
              <span className="mk-qty"><i><IconMinus size={10} /></i>{qty}<i className="add"><IconPlus size={10} /></i></span>
            </div>
          </div>
        ))}
      </div>
    </div>
    {withOrder && (
      <div className="mk-ticket">
        <div className="mk-ticket-head"><TableTag t="A4" /><div><b>Amara Okafor</b><small>Table A4 · 2 guests</small></div></div>
        <h6>Order detail</h6>
        {[['Eggs Benedict', 'Extra hollandaise', 1, 12.5], ['Smoked Salmon Bagel', 'No capers', 2, 28], ['Flat White', 'Oat milk', 2, 10]].map(([n, mod, q, p]) => (
          <div key={n as string} className="mk-line"><div><b>{n}</b><small>{mod}</small></div><span>×{q}</span><em>${(p as number).toFixed(2)}</em></div>
        ))}
        <div className="mk-sum"><span>Subtotal</span><span>$50.50</span></div>
        <div className="mk-sum"><span>Tax 8%</span><span>$4.04</span></div>
        <div className="mk-sum total"><span>Total</span><span>$54.54</span></div>
        <div className="mk-send">Send to kitchen <IconArrowRight size={13} stroke={2.5} /></div>
      </div>
    )}
  </div>
);

/* ───────────────────────── Floor plan ───────────────────────── */

type TableState = 'free' | 'seated' | 'ordering' | 'bill';
const TABLES: { id: string; seats: number; s: TableState; round?: boolean; info?: string }[] = [
  { id: 'A1', seats: 2, s: 'seated', round: true, info: '32m' }, { id: 'A2', seats: 2, s: 'free', round: true },
  { id: 'A3', seats: 4, s: 'ordering', info: '4m' }, { id: 'A4', seats: 4, s: 'seated', info: '18m' },
  { id: 'B1', seats: 6, s: 'bill', info: '$186' }, { id: 'B2', seats: 4, s: 'seated', info: '9m' },
  { id: 'B3', seats: 2, s: 'free', round: true }, { id: 'B4', seats: 4, s: 'ordering', info: '1m' },
  { id: 'C1', seats: 8, s: 'seated', info: '47m' }, { id: 'C2', seats: 2, s: 'bill', round: true, info: '$62' },
  { id: 'C3', seats: 4, s: 'free' }, { id: 'C4', seats: 2, s: 'seated', round: true, info: '25m' },
];
const TABLE_LABEL: Record<TableState, string> = { free: 'Available', seated: 'Seated', ordering: 'Ordering', bill: 'Bill requested' };

export const FloorMock: React.FC = () => (
  <div className="mk mk-floor">
    <div className="mk-floor-head">
      <div><h5>Main dining room</h5><small>12 tables · 34 covers seated</small></div>
      <div className="mk-legend">{(Object.keys(TABLE_LABEL) as TableState[]).map((s) => <span key={s} className={s}>{TABLE_LABEL[s]}</span>)}</div>
    </div>
    <div className="mk-floor-grid">
      {TABLES.map((t) => (
        <div key={t.id} className={`mk-table ${t.s}${t.round ? ' round' : ''}${t.seats >= 6 ? ' big' : ''}`}>
          <b>{t.id}</b>
          <small><IconUsers size={11} /> {t.seats}</small>
          {t.info && <em>{t.info}</em>}
        </div>
      ))}
    </div>
  </div>
);

/* ───────────────────────── Inventory ───────────────────────── */

const STOCK: [string, string, number, string][] = [
  ['Arborio rice', 'Dry store', 82, '18.4 kg'], ['Salmon fillet', 'Walk-in', 14, '2.1 kg'],
  ['Free-range eggs', 'Walk-in', 46, '138 pcs'], ['Oat milk', 'Bar', 9, '3 L'],
  ['Parmesan', 'Walk-in', 61, '4.6 kg'], ['Sourdough loaf', 'Bakery', 22, '6 pcs'],
];

export const InventoryMock: React.FC = () => (
  <div className="mk mk-inv">
    <div className="mk-floor-head">
      <div><h5>Inventory</h5><small>Deducted live from recipes as you sell</small></div>
      <span className="mk-alert">3 items to reorder</span>
    </div>
    <div className="mk-inv-table">
      <div className="mk-inv-row th"><span>Ingredient</span><span>Level</span><span>On hand</span><span>Status</span></div>
      {STOCK.map(([name, where, pct, qty]) => {
        const st = pct < 15 ? 'reorder' : pct < 30 ? 'low' : 'ok';
        return (
          <div key={name} className="mk-inv-row">
            <span><b>{name}</b><small>{where}</small></span>
            <span className="mk-bar"><i className={st} style={{ width: `${pct}%` }} /></span>
            <span>{qty}</span>
            <span><em className={`mk-chip ${st}`}>{st === 'ok' ? 'In stock' : st === 'low' ? 'Low' : 'Reorder'}</em></span>
          </div>
        );
      })}
    </div>
  </div>
);

/* ───────────────────────── Kitchen display ───────────────────────── */

const TICKETS = [
  { t: 'B2', time: '06:12', late: false, items: [['2×', 'Ribeye steak', 'Medium rare'], ['1×', 'Truffle fries', '']] },
  { t: 'A3', time: '11:48', late: true, items: [['1×', 'Chicken Tikka Tacos', 'No coriander'], ['2×', 'Margherita Pizza', 'Extra basil'], ['1×', 'Caesar salad', '']] },
  { t: 'TA', time: '02:05', late: false, items: [['3×', 'Spaghetti Bolognese', ''], ['1×', 'Garlic bread', 'Vegan']] },
];

export const KitchenMock: React.FC = () => (
  <div className="mk mk-kds">
    <div className="mk-kds-tabs">
      <span className="on"><IconChefHat size={13} /> Grill · 3</span><span>Fry · 2</span><span>Pastry · 1</span><span>Bar · 4</span>
    </div>
    <div className="mk-kds-grid">
      {TICKETS.map((k) => (
        <div key={k.t + k.time} className={`mk-kds-ticket${k.late ? ' late' : ''}`}>
          <div className="mk-kds-head"><b>{k.t === 'TA' ? 'Takeaway' : `Table ${k.t}`}</b><span><IconClock size={11} /> {k.time}</span></div>
          {k.items.map(([q, n, m]) => (
            <div key={n} className="mk-kds-item"><em>{q}</em><div><b>{n}</b>{m && <small>{m}</small>}</div></div>
          ))}
          <div className="mk-bump">Bump <IconCheck size={12} stroke={3} /></div>
        </div>
      ))}
    </div>
  </div>
);

/* ───────────────────────── Payments ───────────────────────── */

export const PaymentMock: React.FC = () => (
  <div className="mk mk-pay2">
    <div className="mk-check">
      <div className="mk-ticket-head"><TableTag t="B1" /><div><b>Table B1</b><small>6 guests · Order #921</small></div></div>
      <div className="mk-split">{['Guest 1', 'Guest 2', 'Guest 3'].map((g, i) => <span key={g} className={i === 0 ? 'on' : ''}>{g}</span>)}</div>
      {[['Ribeye steak', 34], ['Truffle fries', 8], ['House red (glass)', 11]].map(([n, p]) => (
        <div key={n as string} className="mk-sum"><span>{n}</span><span>${(p as number).toFixed(2)}</span></div>
      ))}
      <div className="mk-sum muted"><span>Service 10%</span><span>$5.30</span></div>
      <div className="mk-sum total"><span>Guest 1 total</span><span>$58.30</span></div>
    </div>
    <div className="mk-methods">
      <h5>Payment method</h5>
      <div className="mk-method-grid">
        <span className="on"><IconCreditCard size={20} />Card</span>
        <span><IconCash size={20} />Cash</span>
        <span><IconQrcode size={20} />QR pay</span>
        <span><IconUsers size={20} />Split</span>
      </div>
      <div className="mk-tip"><span>Tip</span>{['10%', '15%', '20%'].map((t, i) => <em key={t} className={i === 1 ? 'on' : ''}>{t}</em>)}</div>
      <div className="mk-send">Charge $67.05 <IconArrowRight size={13} stroke={2.5} /></div>
      <small className="mk-receipt"><IconPrinter size={12} /> Receipt prints at the bar</small>
    </div>
  </div>
);

/* ───────────────────────── Light mini-art for feature cards ───────────────────────── */

export const PosMini: React.FC = () => (
  <div className="mi mi-pos">
    <div className="mi-tiles">
      {[IconEgg, IconPizza, IconCoffee, IconSalad, IconCake, IconSoup].map((Icon, i) => (
        <span key={i} className={i === 1 ? 'on' : ''}><Icon size={22} stroke={1.5} /></span>
      ))}
    </div>
    <div className="mi-checkout"><span>3 items · $34.50</span><b>Checkout</b></div>
  </div>
);

export const OrdersMini: React.FC = () => (
  <div className="mi mi-orders">
    <h6>Order list</h6>
    {ORDERS.slice(0, 3).map((o) => (
      <div key={o.name} className="mi-row">
        <TableTag t={o.t} /><div><b>{o.name}</b><small>{o.items} items</small></div>
        <span className={`mk-badge ${o.s}`}>{STATUS[o.s][0]}</span>
      </div>
    ))}
  </div>
);

export const AnalyticsMini: React.FC = () => (
  <div className="mi mi-stats">
    <div className="mi-stat"><span>Net sales today</span><b>$8,642</b><em><IconTrendingUp size={13} /> +12.4%</em></div>
    <div className="mi-bars">{[38, 52, 44, 68, 60, 84, 72].map((h, i) => <i key={i} style={{ height: `${h}%` }} className={i === 5 ? 'on' : ''} />)}</div>
  </div>
);

/** Order-tracking composition: a ticket with two floating status cards. */
export const TrackArt: React.FC = () => (
  <div className="mi-track">
    <div className="mi-float top">
      <TableTag t="B2" /><div><b>Daniel Reyes</b><small>4 items</small></div>
      <span className="mk-badge cooking"><IconClock size={11} />Cooking</span>
    </div>
    <div className="mi-card">
      <div className="mk-ticket-head"><TableTag t="A4" /><div><b>Amara Okafor</b><small>Table A4 · Order #918</small></div><span className="mk-badge ready"><IconCheck size={11} stroke={3} />Ready</span></div>
      {[['Truffle Mushroom Risotto', 1, 18], ['Chicken Tikka Tacos', 2, 26], ['Lemonade', 2, 9]].map(([n, q, p]) => (
        <div key={n as string} className="mi-line"><span>{n}</span><span>×{q}</span><b>${(p as number).toFixed(2)}</b></div>
      ))}
      <div className="mi-line total"><span>Total</span><span /><b>$57.24</b></div>
      <div className="mi-steps">
        {['Sent', 'Cooking', 'Ready', 'Paid'].map((s, i) => <span key={s} className={i < 3 ? 'done' : ''}><i />{s}</span>)}
      </div>
      <div className="mi-actions"><span>Add items</span><b>Pay now</b></div>
    </div>
    <div className="mi-float bottom">
      <TableTag t="A9" /><div><b>Lucas Moreau</b><small>8 items</small></div>
      <span className="mk-badge done"><IconClipboardCheck size={11} />Completed</span>
    </div>
  </div>
);
