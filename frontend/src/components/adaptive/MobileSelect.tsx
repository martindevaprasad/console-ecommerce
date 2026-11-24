import React, { useId, useMemo, useState } from 'react';
import { IconCheck, IconChevronDown, IconSearch } from '@tabler/icons-react';
import { useDevice } from './device';
import { BottomSheet } from './BottomSheet';

export interface SelectOption { value: string; label: React.ReactNode; hint?: React.ReactNode; disabled?: boolean; searchText?: string }

export interface MobileSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Sheet title and accessible name */
  label: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

const SHEET_THRESHOLD = 6;   // more options than this → bottom-sheet picker on phones
const SEARCH_THRESHOLD = 15; // more than this → searchable

/**
 * Drop-in select. Desktop, tablet and short lists: the native <select>. Phones with more than
 * six options: a bottom-sheet picker (searchable past fifteen), which is easier to scan and
 * reach than a long native wheel.
 */
export const MobileSelect: React.FC<MobileSelectProps> = ({ value, onChange, options, label, placeholder, disabled, className, style, id }) => {
  const { isMobile } = useDevice();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const autoId = useId();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) => (o.searchText || (typeof o.label === 'string' ? o.label : String(o.value))).toLowerCase().includes(needle));
  }, [options, q]);

  if (!isMobile || options.length <= SHEET_THRESHOLD) {
    return (
      <select id={id} className={`form-select${className ? ` ${className}` : ''}`} style={style} value={value} disabled={disabled} aria-label={label}
        onChange={(e) => onChange(e.target.value)}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{typeof o.label === 'string' ? o.label : o.value}</option>)}
      </select>
    );
  }

  const current = options.find((o) => o.value === value);
  const close = () => { setOpen(false); setQ(''); };

  return (
    <>
      <button type="button" id={id || autoId} className={`form-select m-select-trigger${className ? ` ${className}` : ''}`} disabled={disabled}
        onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`${label}: ${current && typeof current.label === 'string' ? current.label : placeholder || 'none'}`}>
        <span className={current ? '' : 'muted'}>{current ? current.label : placeholder || 'Select…'}</span>
        <IconChevronDown size={16} aria-hidden />
      </button>
      <BottomSheet open={open} onClose={close} title={label} snapPoints={options.length > SEARCH_THRESHOLD ? [0.92] : undefined}>
        {options.length > SEARCH_THRESHOLD && (
          <div className="search-input-wrapper m-select-search">
            <span className="search-icon" style={{ display: 'flex' }}><IconSearch size={16} /></span>
            <input className="form-input search-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${label.toLowerCase()}`} />
          </div>
        )}
        <div className="list-group-body" role="listbox" aria-label={label}>
          {placeholder !== undefined && !q && (
            <button type="button" role="option" aria-selected={value === ''} className="list-row" onClick={() => { onChange(''); close(); }}>
              <span className="list-row-text"><b className="muted">{placeholder}</b></span>
              {value === '' && <IconCheck size={18} className="as-check" />}
            </button>
          )}
          {filtered.map((o) => (
            <button key={o.value} type="button" role="option" aria-selected={o.value === value} disabled={o.disabled}
              className={`list-row${o.disabled ? ' disabled' : ''}`} onClick={() => { onChange(o.value); close(); }}>
              <span className="list-row-text"><b>{o.label}</b>{o.hint && <small>{o.hint}</small>}</span>
              {o.value === value && <IconCheck size={18} className="as-check" />}
            </button>
          ))}
          {!filtered.length && <div className="list-row"><span className="list-row-text"><small>No matches</small></span></div>}
        </div>
      </BottomSheet>
    </>
  );
};

export default MobileSelect;
