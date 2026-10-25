import React, { useId } from 'react';
import { MARK_PATHS } from '../layout/AppSvgs';

// Illustrations for the public landing page. Everything is inline SVG so the
// page ships with no image assets. Palette = the logo's: brand blue #5E84FF,
// mint #67FFCC and ink #0B1640, plus deeper "blueberry" shades of the blue.

const INK = '#0B1640';
const BLUE = '#5E84FF';
const MINT = '#67FFCC';
const BERRY_DEEP = '#26318F';
const BERRY_DARK = '#1E2A85';

/** The GMOS mark with its hidden cloche & toque outlines drawn at full strength. */
export const MarkGlow: React.FC<{ size?: number }> = ({ size = 120 }) => (
  <svg width={size} height={size} viewBox="0 8 36 36" fill="none" aria-hidden>
    <rect y="8" width="36" height="36" rx="11.0495" fill={BLUE} />
    <path d={MARK_PATHS.dome} stroke={MINT} strokeOpacity="0.55" strokeWidth="0.35" />
    <path d={MARK_PATHS.crown} stroke={MINT} strokeOpacity="0.55" strokeWidth="0.35" />
    <path d={MARK_PATHS.fold} fill="#050B1F" />
  </svg>
);

export type BerryMood = 'happy' | 'cool' | 'worried';

interface BerryProps {
  size?: number;
  mood?: BerryMood;
  /** Chef's toque instead of the leaf */
  hat?: boolean;
  /** Right arm waves hello */
  wave?: boolean;
  /** Holds a blueberry smoothie in the right hand */
  drink?: boolean;
  className?: string;
}

/**
 * "Berry", the mascot: a blueberry whose five-point crown echoes the crown in
 * the GMOS mark. Moods swap the face; hat / wave / drink are poses.
 */
export const Berry: React.FC<BerryProps> = ({ size = 140, mood = 'happy', hat, wave, drink, className }) => {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 160 160" fill="none" aria-hidden>
      <defs>
        <radialGradient id={`${id}b`} cx=".36" cy=".3" r=".78">
          <stop offset="0" stopColor="#B3C4FF" />
          <stop offset=".32" stopColor={BLUE} />
          <stop offset=".74" stopColor="#3A4FD0" />
          <stop offset="1" stopColor={BERRY_DEEP} />
        </radialGradient>
      </defs>

      {/* feet */}
      <ellipse cx="62" cy="148" rx="12" ry="6" fill={BERRY_DARK} stroke={INK} strokeWidth="3" />
      <ellipse cx="98" cy="148" rx="12" ry="6" fill={BERRY_DARK} stroke={INK} strokeWidth="3" />

      {/* left arm */}
      <path d="M30 104c-8 3-13 7-16 12" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <circle cx="13" cy="118" r="5.5" fill={BLUE} stroke={INK} strokeWidth="3" />

      {/* right arm: wave, hold a drink, or rest */}
      {wave ? (
        <g className="lp-berry-wave">
          <path d="M131 92c8-6 12-14 14-24" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <circle cx="146" cy="64" r="5.5" fill={BLUE} stroke={INK} strokeWidth="3" />
        </g>
      ) : drink ? null : (
        <g>
          <path d="M130 104c8 3 13 7 16 12" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <circle cx="147" cy="118" r="5.5" fill={BLUE} stroke={INK} strokeWidth="3" />
        </g>
      )}

      {/* body + dusty bloom */}
      <circle cx="80" cy="94" r="54" fill={`url(#${id}b)`} stroke={INK} strokeWidth="3.5" />
      <path d="M44 80c4-15 15-25 29-29" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity=".55" />
      <g fill="#DCE5FF" opacity=".35">
        <ellipse cx="110" cy="74" rx="3" ry="2" /><ellipse cx="118" cy="98" rx="2.4" ry="1.6" />
        <ellipse cx="52" cy="124" rx="2.6" ry="1.7" /><ellipse cx="98" cy="132" rx="2" ry="1.4" />
      </g>

      {/* crown (calyx) + leaf, or the chef's toque */}
      {hat ? (
        <g transform="translate(19.8 -4) scale(.86)" className="lp-mascot-hat">
          <path d="M44 46c-10 0-16-8-13-17 3-8 12-10 18-7 2-9 11-15 21-15s19 6 21 15c6-3 15-1 18 7 3 9-3 17-13 17z" fill="#fff" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M46 44h48v14H46z" fill="#fff" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M58 30c2-5 6-7 10-7" stroke={INK} strokeWidth="2.5" strokeLinecap="round" opacity=".35" />
        </g>
      ) : (
        <g>
          <path d="M84 33c6-12 18-17 29-12-4 11-17 17-29 12z" fill={MINT} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M87 31c7-4 14-7 21-9" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity=".35" />
          <polygon points="80,30 83.5,39.2 93.3,39.7 85.7,45.9 88.2,55.3 80,50 71.8,55.3 74.3,45.9 66.7,39.7 76.5,39.2"
            fill={BERRY_DARK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <circle cx="80" cy="44" r="3" fill={INK} />
        </g>
      )}

      {/* cheeks */}
      <ellipse cx="53" cy="107" rx="7" ry="4" fill="#FF9EC4" opacity=".6" />
      <ellipse cx="107" cy="107" rx="7" ry="4" fill="#FF9EC4" opacity=".6" />

      {/* face */}
      {mood === 'cool' ? (
        <g>
          <path d="M48 87h64" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <rect x="51" y="84" width="25" height="15" rx="5" fill={INK} />
          <rect x="84" y="84" width="25" height="15" rx="5" fill={INK} />
          <path d="M55 88h4M59 92h4M88 88h4M92 92h4" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M70 110c6 5 14 4 20-3" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          <g className="lp-mascot-eyes">
            <ellipse cx="64" cy="90" rx="7.5" ry="8.5" fill="#fff" stroke={INK} strokeWidth="3" />
            <ellipse cx="96" cy="90" rx="7.5" ry="8.5" fill="#fff" stroke={INK} strokeWidth="3" />
            <circle cx={mood === 'worried' ? 64 : 66} cy={mood === 'worried' ? 87 : 92} r="3.6" fill={INK} />
            <circle cx={mood === 'worried' ? 96 : 98} cy={mood === 'worried' ? 87 : 92} r="3.6" fill={INK} />
            <circle cx={mood === 'worried' ? 65 : 67} cy={mood === 'worried' ? 85.6 : 90.5} r="1.2" fill="#fff" />
            <circle cx={mood === 'worried' ? 97 : 99} cy={mood === 'worried' ? 85.6 : 90.5} r="1.2" fill="#fff" />
          </g>
          {mood === 'worried' ? (
            <g>
              <path d="M55 79l14-5M105 79l-14-5" stroke={INK} strokeWidth="3" strokeLinecap="round" />
              <path d="M68 113c4-4 8 4 12 0s8 4 12 0" stroke={INK} strokeWidth="3" strokeLinecap="round" />
              <path d="M121 66c3 5 4 8 0 9s-4-4 0-9z" fill="#9DE7FF" stroke={INK} strokeWidth="2" />
            </g>
          ) : (
            <path d="M68 105q12 13 24 0z" fill={INK} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          )}
        </g>
      )}

      {/* blueberry smoothie in the right hand */}
      {drink && (
        <g>
          <path d="M131 101c4 1 7 2 9 4" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <path d="M150 88l6-15" stroke={MINT} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M136 88h22l-3 34h-16z" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M137.6 99h18.8l-2 21h-14.8z" fill="#6E5BE0" />
          <circle cx="141" cy="104" r="1.6" fill="#B3C4FF" /><circle cx="150" cy="111" r="1.4" fill="#B3C4FF" />
          <circle cx="141" cy="107" r="5.5" fill={BLUE} stroke={INK} strokeWidth="3" />
        </g>
      )}
    </svg>
  );
};

/** A blueberry bush: leafy mound with berry clusters. */
const Bush: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-44 10c-6-16 6-28 20-26 2-14 18-22 30-14 10-10 30-6 32 10 14 0 22 16 14 30z" fill="#0B5E54" />
    <path d="M-30-6c4-6 10-8 16-8M8-22c6-2 12 0 16 4" stroke={MINT} strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" fill="none" />
    {[[-24, -2], [-14, 4], [-18, -12], [10, -6], [20, 2], [14, -16], [30, -4]].map(([cx, cy], i) => (
      <g key={i}>
        <circle cx={cx} cy={cy} r="6.5" fill={i % 3 ? BLUE : '#3A4FD0'} stroke={INK} strokeWidth="1.6" />
        <circle cx={cx} cy={cy - 4} r="1.6" fill={INK} />
        <circle cx={cx - 2} cy={cy - 1} r="1.4" fill="#fff" opacity=".6" />
      </g>
    ))}
  </g>
);

/** Rolling mint hills with a blue stream and blueberry bushes — foot of the hero and the features band. */
export const Landscape: React.FC<{ className?: string; river?: boolean }> = ({ className, river = true }) => (
  <svg className={className} viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice" aria-hidden>
    <path d="M0 150C180 70 340 60 520 120s320 70 470 10 300-80 450-20V300H0z" fill="#0E6E62" />
    <path d="M0 150C180 70 340 60 520 120s320 70 470 10 300-80 450-20" stroke={MINT} strokeOpacity=".35" strokeWidth="4" fill="none" />
    <path d="M0 200c160-60 330-80 520-30s300 60 480 0 290-50 440 0V300H0z" fill="#13A383" />
    {river && <path d="M640 300c30-50 40-90 120-120s170-20 200-50" stroke={BLUE} strokeWidth="38" fill="none" strokeLinecap="round" />}
    {river && <path d="M640 300c30-50 40-90 120-120s170-20 200-50" stroke="#B3C4FF" strokeWidth="10" fill="none" strokeLinecap="round" opacity=".7" />}
    <path d="M0 250c200-40 400-40 620-10s420 30 820-20V300H0z" fill="#1EC796" />
    <path d="M0 250c200-40 400-40 620-10s420 30 820-20" stroke={MINT} strokeOpacity=".6" strokeWidth="4" fill="none" />
    <Bush x={52} y={236} s={0.8} />
    <Bush x={340} y={168} s={0.7} />
    <Bush x={1120} y={170} s={0.8} />
    <Bush x={1300} y={206} s={1.05} />
    <Bush x={920} y={214} s={0.6} />
  </svg>
);

/** Night-sky clouds for the hero backdrop. */
export const Clouds: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 1440 400" preserveAspectRatio="xMidYMid slice" aria-hidden>
    <g fill="#2E5BD8" opacity=".35">
      <path d="M60 330a50 50 0 0 1 90-30 60 60 0 0 1 110 10 40 40 0 0 1 50 40H60z" />
      <path d="M1100 300a55 55 0 0 1 100-30 65 65 0 0 1 120 10 45 45 0 0 1 60 40h-280z" />
      <path d="M1250 120a30 30 0 0 1 55-18 38 38 0 0 1 70 6 26 26 0 0 1 35 25h-160z" />
    </g>
    <g fill="#fff">
      {[[120, 60], [300, 140], [520, 40], [760, 90], [980, 30], [1180, 70], [1380, 180], [880, 200], [220, 220]].map(([x, y], i) => (
        <circle key={i} className="lp-star" cx={x} cy={y} r={i % 3 === 0 ? 2.2 : 1.4} style={{ animationDelay: `${i * 0.4}s` }} />
      ))}
    </g>
  </svg>
);

/** The "service chaos" pit: a blueberry-jam puddle with a worried Berry sinking in it. */
export const JamPit: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 360 150" fill="none" aria-hidden>
    {/* crusted rim + jam */}
    <ellipse cx="180" cy="104" rx="172" ry="42" fill="#3A2E9E" stroke={INK} strokeWidth="3" />
    <ellipse cx="180" cy="104" rx="150" ry="32" fill="#1A1150" />
    {/* Berry, waist-deep */}
    <g transform="translate(116 10) scale(.8)">
      <Berry size={160} mood="worried" wave />
    </g>
    {/* front half of the jam swallows Berry below the surface line */}
    <path d="M30 104a150 32 0 0 0 300 0z" fill="#1A1150" />
    <path d="M60 110c40 10 90 13 130 12" stroke="#6E5BE0" strokeWidth="5" strokeLinecap="round" opacity=".55" />
    <g fill="#6E5BE0">
      <circle cx="96" cy="98" r="5" opacity=".7" /><circle cx="262" cy="96" r="4" opacity=".7" /><circle cx="236" cy="112" r="3" opacity=".6" />
    </g>
    {/* splatters */}
    <g fill="#3A2E9E" stroke={INK} strokeWidth="2">
      <circle cx="18" cy="74" r="5" /><circle cx="342" cy="70" r="4" /><circle cx="330" cy="140" r="3.5" />
    </g>
  </svg>
);
