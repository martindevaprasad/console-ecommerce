import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconArrowRight, IconArrowUpRight, IconCheck, IconMenu2, IconX, IconCalendarEvent, IconCashRegister, IconChefHat,
  IconLayoutGrid, IconArchive, IconUsersGroup, IconUsers, IconChartBar, IconDiscount2, IconCash, IconToolsKitchen2,
  IconShieldLock, IconBolt, IconDeviceTablet, IconDeviceDesktop, IconDeviceMobile, IconBrandWindows, IconBrandApple,
  IconBrandAndroid, IconPrinter, IconBrowser, IconBurger, IconCoffee, IconCake, IconGlassFull, IconTruck,
  IconBuildingSkyscraper, IconSoup, IconBed, IconToolsKitchen, IconStar, IconPlayerPlayFilled, IconPizza, IconIceCream,
  IconBread, IconPlus, IconMinus, IconChevronLeft, IconChevronRight, IconQuote, IconCircleCheckFilled, IconCreditCard,
} from '@tabler/icons-react';
import { MageWordmark } from '../layout/AppSvgs';
import {
  Scaled, DashboardMock, MenuMock, FloorMock, InventoryMock, KitchenMock, PaymentMock, PosMini, OrdersMini,
  AnalyticsMini, TrackArt,
} from './LandingMockups';
import './landing.css';

const NAV_LINKS = [
  { id: 'top', label: 'Home' },
  { id: 'features', label: 'Features' },
  { id: 'how', label: 'How it works' },
  { id: 'pricing', label: 'Pricing' },
];

// Mirrors the business-type presets the onboarding wizard offers (backend/src/lib/templates.ts).
const FORMATS = [
  { icon: IconToolsKitchen, label: 'Fine dining' },
  { icon: IconSoup, label: 'Casual dining' },
  { icon: IconBurger, label: 'Quick service' },
  { icon: IconCoffee, label: 'Café & coffee' },
  { icon: IconCake, label: 'Bakery' },
  { icon: IconGlassFull, label: 'Bar & pub' },
  { icon: IconTruck, label: 'Food truck' },
  { icon: IconBuildingSkyscraper, label: 'Cloud kitchen' },
  { icon: IconBed, label: 'Hotel outlets' },
];

const DEVICES = [
  { icon: IconBrowser, label: 'Any browser' },
  { icon: IconDeviceTablet, label: 'iPad & tablets' },
  { icon: IconBrandApple, label: 'macOS' },
  { icon: IconBrandWindows, label: 'Windows' },
  { icon: IconBrandAndroid, label: 'Android' },
  { icon: IconDeviceDesktop, label: 'Kitchen screens' },
  { icon: IconDeviceMobile, label: 'Phones' },
  { icon: IconPrinter, label: 'Receipt printers' },
];

const MODULES = [
  { icon: IconCashRegister, label: 'POS terminal & payments' },
  { icon: IconChefHat, label: 'Kitchen display & bump' },
  { icon: IconLayoutGrid, label: 'Live floor plan' },
  { icon: IconCalendarEvent, label: 'Reservations & waitlist' },
  { icon: IconToolsKitchen2, label: 'Menu, modifiers & taxes' },
  { icon: IconDiscount2, label: 'Promotions & happy hours' },
  { icon: IconArchive, label: 'Inventory & recipes' },
  { icon: IconUsersGroup, label: 'Guests & loyalty' },
  { icon: IconUsers, label: 'Staff, roles & time clock' },
  { icon: IconCash, label: 'Cash, shifts & Z reports' },
  { icon: IconChartBar, label: 'Sales analytics' },
  { icon: IconShieldLock, label: 'Permissions & audit' },
];

const HIGHLIGHTS = [
  { title: 'Fast, friendly POS', text: 'Big tiles, modifiers and split checks your team learns in a single shift — no thick manual required.', Art: PosMini },
  { title: 'Intuitive order management', text: 'Every ticket, its table and its status in one live list, so servers stop running back to the pass to ask.', Art: OrdersMini },
  { title: 'Real-time analytics & reporting', text: 'Sales, covers and best-sellers update as you trade, so you can spot what to push before the rush ends.', Art: AnalyticsMini },
];

const STEPS = [
  { title: 'Digital menu & modifiers', text: 'Build categories, modifiers, combos and taxes once. Changes reach every terminal instantly — no reprinting menus.', Mock: () => <MenuMock /> },
  { title: 'Table & floor management', text: 'A live floor plan shows who is seated, ordering or waiting on the bill, with timers on every table.', Mock: FloorMock },
  { title: 'Inventory & recipes', text: 'Recipes deduct stock as you sell, and low items queue up for reorder before you run dry.', Mock: InventoryMock },
  { title: 'Kitchen display integration', text: 'Orders fire straight to the right station, sorted by time. Cooks bump when ready and the pass knows.', Mock: KitchenMock },
  { title: 'Integrated payment processing', text: 'Split by guest or item, add tips, take card, cash or QR, and print or send the receipt — all from one screen.', Mock: PaymentMock },
];

// Placeholder pricing — confirm before launch.
const PLANS = [
  { name: 'Starter', blurb: 'Everything one counter needs to start taking orders.', monthly: 0,
    perks: ['1 location, 2 devices', 'POS terminal & payments', 'Menu with modifiers & taxes', 'Daily sales reports'] },
  { name: 'Growth', badge: 'Most popular', blurb: 'For busy single sites running front and back of house.', monthly: 49,
    perks: ['Everything in Starter', 'Unlimited devices', 'Kitchen display & stations', 'Floor plan & reservations', 'Inventory & recipes'] },
  { name: 'Multi-site', blurb: 'Groups and franchises that need one view across outlets.', monthly: 199,
    perks: ['Everything in Growth', 'Up to 10 locations', 'Central menu & promotions', 'Cross-location analytics', 'Priority support'] },
  { name: 'Enterprise', blurb: 'Chains, hotels and catering with custom rollouts.', monthly: null,
    perks: ['Everything in Multi-site', 'Unlimited locations', 'Guided onboarding', 'Uptime SLA', 'Dedicated success manager'] },
];

const ROLES = [
  { role: 'Owner', icon: IconChartBar, say: 'Sales, labour and stock for every outlet on one dashboard, before I have finished my coffee.' },
  { role: 'Server', icon: IconCashRegister, say: 'Seat the table, send the order, split the check three ways. No running back to the till.' },
  { role: 'Head chef', icon: IconChefHat, say: 'Tickets land on my station already sorted. Bump when it is up, and the pass knows.' },
  { role: 'Manager', icon: IconUsers, say: 'Open the shift, count the drawer, close with a Z report. Roles keep everyone in their lane.' },
  { role: 'Barista', icon: IconCoffee, say: 'Oat, extra shot, half sweet. Modifiers come through exactly how the guest asked.' },
  { role: 'Buyer', icon: IconArchive, say: 'Recipes deduct stock as we sell, so reorders queue up before we run dry.' },
];

const FAQS = [
  { q: 'What is GMOS?', a: 'GMOS is a restaurant operating system: a console where you configure menus, stations, staff and locations, plus the service screens your team uses on shift — POS, floor plan and kitchen display — all reading from the same live data.' },
  { q: 'Is GMOS easy to set up?', a: 'Yes. Pick your format — fine dining, café, food truck, hotel outlet and more — and the onboarding wizard presets the service flow, kitchen stations, order types and modules. Everything stays editable afterwards.' },
  { q: 'What hardware do I need?', a: 'Whatever you already own. GMOS runs in any modern browser, so iPads, Android tablets, Windows and macOS machines, kitchen screens and phones all work, alongside your receipt printers.' },
  { q: 'Can I run more than one location?', a: 'Yes. Outlets, stations and devices are all managed from one console, with a central menu, shared promotions and cross-location reporting on the Multi-site plan and above.' },
  { q: 'How do I get started?', a: 'Create a free account — no card required — and you can be taking orders on the Starter plan today. Upgrade whenever you need more devices, the kitchen display or more locations.' },
];

const BUBBLES = [
  { icon: IconIceCream, cls: 'b1' }, { icon: IconSoup, cls: 'b2' }, { icon: IconPizza, cls: 'b3' },
  { icon: IconBread, cls: 'b4' }, { icon: IconBurger, cls: 'b5' }, { icon: IconCoffee, cls: 'b6' },
];

/** Adds `.in` to `.lp-reveal` elements as they scroll into view. */
function useReveal(root: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const els = root.current?.querySelectorAll('.lp-reveal');
    if (!els?.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [root]);
}

/** Tracks which nav section is currently under the sticky header. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const onScroll = () => {
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 140) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [ids]);
  return active;
}

const SECTION_IDS = NAV_LINKS.map((l) => l.id);

export const LandingPage: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [yearly, setYearly] = useState(false);
  const [step, setStep] = useState(0);
  const [faq, setFaq] = useState<number | null>(0);
  const [slide, setSlide] = useState(0);
  const active = useActiveSection(SECTION_IDS);
  useReveal(rootRef);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const prev = document.title;
    document.title = 'GMOS · The restaurant operating system';
    return () => { document.title = prev; };
  }, []);

  const price = (m: number) => (yearly ? Math.round(m * 0.8) : m);

  // Testimonial rail: arrows scroll by one card; dots follow the scroll position.
  const cardStep = () => {
    const rail = railRef.current;
    const card = rail?.firstElementChild as HTMLElement | null;
    return card ? card.offsetWidth + parseFloat(getComputedStyle(rail!).columnGap || '0') : 0;
  };
  const scrollRail = (dir: number) => railRef.current?.scrollBy({ left: dir * cardStep(), behavior: 'smooth' });
  const goToSlide = (i: number) => railRef.current?.scrollTo({ left: i * cardStep(), behavior: 'smooth' });
  const onRailScroll = () => {
    const w = cardStep();
    if (w) setSlide(Math.round((railRef.current?.scrollLeft ?? 0) / w));
  };

  const ActiveMock = STEPS[step].Mock;

  return (
    <div className="lp" ref={rootRef}>
      {/* ── Nav ── */}
      <header className={`lp-nav${scrolled ? ' scrolled' : ''}${menuOpen ? ' open' : ''}`}>
        <div className="lp-nav-inner">
          <a href="#top" className="lp-logo" aria-label="GMOS home" onClick={() => setMenuOpen(false)}>
            <MageWordmark height={30} />
          </a>
          <nav className="lp-nav-links" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <a key={l.id} href={`#${l.id}`} className={active === l.id ? 'on' : ''} aria-current={active === l.id ? 'true' : undefined}
                onClick={() => setMenuOpen(false)}>{l.label}</a>
            ))}
          </nav>
          <div className="lp-nav-cta">
            <Link to="/login" className="lp-btn lp-btn-text">Sign in</Link>
            <Link to="/register" className="lp-btn lp-btn-mint">Try for free</Link>
          </div>
          <button type="button" className="lp-burger" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}>
            {menuOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="lp-hero" id="top">
        <div className="lp-hero-bubbles" aria-hidden>
          {BUBBLES.map(({ icon: Icon, cls }) => <span key={cls} className={`lp-bubble ${cls}`}><Icon size={26} stroke={1.6} /></span>)}
        </div>
        <div className="lp-container lp-hero-copy">
          <span className="lp-pill"><i /> The restaurant operating system</span>
          <h1 className="lp-hero-title">
            GMOS for all your <span className="lp-hl">restaurant needs</span>
            <svg className="lp-spark" viewBox="0 0 40 40" aria-hidden><path d="M8 22 4 10M18 18l2-14M27 22l9-9" /></svg>
          </h1>
          <p className="lp-hero-sub">
            Say goodbye to shouted orders and complicated billing. GMOS keeps your counter, floor and kitchen in sync on every screen.
          </p>
          <div className="lp-hero-ctas">
            <Link to="/register" className="lp-btn lp-btn-mint lp-btn-lg">Get started <IconArrowRight size={18} /></Link>
            <a href="#how" className="lp-btn lp-btn-white lp-btn-lg"><span className="lp-play"><IconPlayerPlayFilled size={12} /></span> See how it works</a>
          </div>
          <p className="lp-hero-note"><IconCircleCheckFilled size={16} /> Free Starter plan · No card required</p>
        </div>

        <div className="lp-container lp-hero-device lp-reveal">
          <div className="lp-device">
            <Scaled width={1180}><DashboardMock /></Scaled>
          </div>
        </div>
      </section>

      {/* ── Stats band ── */}
      <section className="lp-band">
        <div className="lp-container lp-band-inner">
          <h2>One console for every<br className="lp-br" /> outlet, station and shift</h2>
          <dl className="lp-band-stats">
            <div><dt>{FORMATS.length}</dt><dd>Formats preset</dd></div>
            <div><dt>{MODULES.length}</dt><dd>Core modules</dd></div>
            <div><dt>{DEVICES.length}+</dt><dd>Device types</dd></div>
          </dl>
        </div>
      </section>

      {/* ── Devices strip ── */}
      <section className="lp-devices">
        <div className="lp-container">
          <p className="lp-devices-title">Runs on the hardware you already own</p>
          <ul className="lp-devices-row">
            {DEVICES.map(({ icon: Icon, label }) => <li key={label}><Icon size={22} stroke={1.6} />{label}</li>)}
          </ul>
        </div>
      </section>

      {/* ── Highlights ── */}
      <section className="lp-section" id="features">
        <div className="lp-container">
          <div className="lp-head lp-reveal">
            <h2 className="lp-h2">Manage your restaurant easily with GMOS</h2>
            <p className="lp-lede">With GMOS you get a seamless, hassle-free way to run front and back of house from one place.</p>
          </div>
          <div className="lp-cards lp-reveal">
            {HIGHLIGHTS.map(({ title, text, Art }) => (
              <article key={title} className="lp-card">
                <div className="lp-card-art"><Scaled width={340}><Art /></Scaled></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Order tracking ── */}
      <section className="lp-section lp-section-tight">
        <div className="lp-container lp-split lp-reveal">
          <div className="lp-split-art"><Scaled width={520}><TrackArt /></Scaled></div>
          <div className="lp-split-copy">
            <span className="lp-eyebrow">Order tracking</span>
            <h2 className="lp-h2">Easily track order status with GMOS</h2>
            <ul className="lp-checks">
              <li><IconCheck size={16} stroke={3} /><span>Real-time updates on every order, so servers always know what stage it is at — from sent to served.</span></li>
              <li><IconCheck size={16} stroke={3} /><span>Orders are grouped in a clear, easy-to-follow list showing in-progress, ready and completed tickets.</span></li>
              <li><IconCheck size={16} stroke={3} /><span>Built-in kitchen display keeps the floor and the kitchen talking without anyone crossing the pass.</span></li>
            </ul>
            <a href="#how" className="lp-btn lp-btn-mint">Learn more <IconArrowRight size={18} /></a>
          </div>
        </div>
      </section>

      {/* ── How it works (tabs) ── */}
      <section className="lp-section lp-how" id="how">
        <div className="lp-container">
          <div className="lp-how-head lp-reveal">
            <h2 className="lp-h2">Make processing orders easy with GMOS</h2>
            <p className="lp-lede">Every screen your team touches during service, reading from the same live data. Pick a module to see it in action.</p>
          </div>
          <div className="lp-how-body lp-reveal">
            <div className="lp-steps" role="tablist" aria-label="GMOS modules" aria-orientation="vertical">
              {STEPS.map((s, i) => (
                <button key={s.title} type="button" role="tab" id={`step-${i}`} aria-selected={step === i} aria-controls="step-panel"
                  className={`lp-step${step === i ? ' on' : ''}`} onClick={() => setStep(i)}>
                  <span className="lp-step-no">0{i + 1}</span>
                  <span className="lp-step-copy"><b>{s.title}</b><small>{s.text}</small></span>
                </button>
              ))}
            </div>
            <div className="lp-step-panel" role="tabpanel" id="step-panel" aria-labelledby={`step-${step}`}>
              <div className="lp-device lp-device-sm" key={step}>
                <Scaled width={680}><ActiveMock /></Scaled>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Modules & formats ── */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-head lp-reveal">
            <span className="lp-eyebrow">Everything included</span>
            <h2 className="lp-h2">All the modules, preset for your format</h2>
            <p className="lp-lede">Pick a format and GMOS presets the service flow, kitchen stations, order types and modules. Everything stays editable later.</p>
          </div>
          <div className="lp-modules lp-reveal">
            {MODULES.map(({ icon: Icon, label }) => (
              <div key={label} className="lp-module"><span><Icon size={22} stroke={1.6} /></span>{label}</div>
            ))}
          </div>
          <div className="lp-formats lp-reveal">
            {FORMATS.map(({ icon: Icon, label }) => (
              <Link to="/register" key={label} className="lp-format"><Icon size={18} stroke={1.7} />{label}</Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="lp-section lp-pricing" id="pricing">
        <svg className="lp-rings" viewBox="0 0 200 200" aria-hidden>
          {[96, 76, 56, 36].map((r) => <circle key={r} cx="100" cy="100" r={r} />)}
        </svg>
        <div className="lp-container">
          <div className="lp-head lp-reveal">
            <h2 className="lp-h2">Choose the plan that suits your business</h2>
            <p className="lp-lede">Start taking orders for free today. Upgrade as you add devices, stations and locations.</p>
          </div>
          <div className="lp-toggle" role="tablist" aria-label="Billing period">
            <button type="button" role="tab" aria-selected={!yearly} className={!yearly ? 'on' : ''} onClick={() => setYearly(false)}>Monthly</button>
            <button type="button" role="tab" aria-selected={yearly} className={yearly ? 'on' : ''} onClick={() => setYearly(true)}>
              <IconBolt size={15} /> Yearly <em>−20%</em>
            </button>
          </div>

          <div className="lp-plans lp-reveal">
            {PLANS.map((p) => (
              <article key={p.name} className={`lp-plan${p.badge ? ' featured' : ''}`}>
                <div className="lp-plan-top">
                  <h3>{p.name}</h3>
                  {p.badge && <span className="lp-badge"><IconStar size={11} /> {p.badge}</span>}
                </div>
                <div className="lp-plan-price">
                  {p.monthly === null ? <strong>Custom</strong> : (
                    <><strong><sup>$</sup>{price(p.monthly)}</strong><span>/location/month</span></>
                  )}
                </div>
                <p className="lp-plan-blurb">{p.blurb}</p>
                <ul>
                  {p.perks.map((x) => <li key={x}><IconCheck size={15} stroke={3} /> {x}</li>)}
                </ul>
                <Link to="/register" className={`lp-btn ${p.badge ? 'lp-btn-mint' : 'lp-btn-soft'} lp-btn-block`}>
                  {p.monthly === null ? 'Talk to us' : p.monthly === 0 ? 'Start free' : 'Get started'}
                </Link>
              </article>
            ))}
          </div>
          <p className="lp-plans-note">Pricing is per location. <a href="#faq">Questions about plans? <IconArrowUpRight size={14} /></a></p>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="lp-section lp-voices">
        <div className="lp-container">
          <div className="lp-head lp-reveal">
            <h2 className="lp-h2">Built for everyone on shift</h2>
            <p className="lp-lede">From the owner's dashboard to the grill station, every role gets a screen made for the job.</p>
          </div>
          <div className="lp-rail-wrap lp-reveal">
            <button type="button" className="lp-rail-btn prev" aria-label="Previous" onClick={() => scrollRail(-1)}><IconChevronLeft size={20} /></button>
            <div className="lp-rail" ref={railRef} onScroll={onRailScroll}>
              {ROLES.map(({ role, icon: Icon, say }) => (
                <figure key={role} className="lp-voice">
                  <IconQuote size={34} className="lp-voice-q" />
                  <blockquote>{say}</blockquote>
                  <figcaption><span className="lp-voice-ico"><Icon size={20} /></span><div><b>{role}</b><small>on GMOS</small></div></figcaption>
                </figure>
              ))}
            </div>
            <button type="button" className="lp-rail-btn next" aria-label="Next" onClick={() => scrollRail(1)}><IconChevronRight size={20} /></button>
          </div>
          <div className="lp-dots" aria-hidden>
            {ROLES.map((r, i) => <button key={r.role} type="button" tabIndex={-1} className={slide === i ? 'on' : ''} onClick={() => goToSlide(i)} />)}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="lp-section" id="faq">
        <div className="lp-container lp-faq-wrap">
          <div className="lp-head lp-reveal">
            <h2 className="lp-h2">Frequently asked questions</h2>
            <p className="lp-lede">We have put together some of the questions restaurant teams ask us most.</p>
          </div>
          <div className="lp-faq lp-reveal">
            {FAQS.map((f, i) => {
              const open = faq === i;
              return (
                <div key={f.q} className={`lp-faq-item${open ? ' open' : ''}`}>
                  <button type="button" aria-expanded={open} aria-controls={`faq-${i}`} onClick={() => setFaq(open ? null : i)}>
                    <span>{f.q}</span>{open ? <IconMinus size={18} /> : <IconPlus size={18} />}
                  </button>
                  <div className="lp-faq-a" id={`faq-${i}`} role="region"><div><p>{f.a}</p></div></div>
                </div>
              );
            })}
          </div>
          <Link to="/register" className="lp-link">Still unsure? Try it free <IconArrowRight size={16} /></Link>
        </div>
      </section>

      {/* ── CTA band ── */}
      <section className="lp-cta">
        <div className="lp-container">
          <div className="lp-cta-copy lp-reveal">
            <h2 className="lp-h2">Get started with GMOS today</h2>
            <p>Say goodbye to paper tickets and end-of-night drawer maths. Open your doors on GMOS tonight.</p>
            <div className="lp-cta-btns">
              <Link to="/register" className="lp-btn lp-btn-ink lp-btn-lg">Create a free account <IconArrowRight size={18} /></Link>
              <Link to="/login" className="lp-btn lp-btn-outline lp-btn-lg"><IconCreditCard size={18} /> Sign in</Link>
            </div>
          </div>
          <div className="lp-device lp-cta-device lp-reveal">
            <Scaled width={1040}><MenuMock withOrder /></Scaled>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-grid">
          <div className="lp-footer-brand">
            <MageWordmark height={30} />
            <p>Helping restaurants grow with one goal in mind — simplify and streamline service, from a single food truck to a global chain.</p>
          </div>
          <div>
            <h5>Product</h5>
            <a href="#top">Home</a><a href="#features">Features</a><a href="#how">How it works</a><a href="#pricing">Pricing</a>
          </div>
          <div>
            <h5>Formats</h5>
            <a href="#features">Restaurants</a><a href="#features">Cafés & bakeries</a><a href="#features">Bars & hotels</a><a href="#features">Cloud kitchens</a>
          </div>
          <div>
            <h5>Account</h5>
            <Link to="/login">Sign in</Link><Link to="/register">Create account</Link><a href="#faq">FAQ</a>
          </div>
        </div>
        <div className="lp-container lp-footer-base">
          <span>© {new Date().getFullYear()} GMOS. All rights reserved.</span>
          <span>Made for the people who run the pass.</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
