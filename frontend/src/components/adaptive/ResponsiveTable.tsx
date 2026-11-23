import React from 'react';
import { useDevice } from './device';
import { KeyValue, MobileCard } from './content';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /**
   * 1 = always shown · 2 = hidden in the condensed tablet table · 3 = desktop only.
   * On phones, priority 1–2 columns become label/value lines in the card.
   */
  priority?: 1 | 2 | 3;
  /** Label used in the phone card (defaults to `header` when it is a string) */
  mobileLabel?: string;
  /** Card slot on phones: title, subtitle, or the top-right trailing value */
  slot?: 'title' | 'subtitle' | 'trailing';
  align?: 'left' | 'right';
  /** Extra class for body cells (e.g. 'strong', 'small') */
  className?: string;
  /** Extra class for the header cell */
  headerClassName?: string;
  /** The cell holds its own controls (toggles, buttons): clicks don't trigger onRowClick */
  interactive?: boolean;
}

export interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  rowStyle?: (row: T) => React.CSSProperties | undefined;
  /** Shown instead of the table when there are no rows */
  empty?: React.ReactNode;
  /** Extra content under each phone card (e.g. action buttons) */
  cardActions?: (row: T) => React.ReactNode;
  /** 'cards' forces the card list on any device (e.g. the list pane of a master–detail split) */
  variant?: 'auto' | 'cards';
  /** Highest column priority shown as card lines (default 2; 1 = compact cards, e.g. split lists) */
  cardPriority?: 1 | 2;
}

/**
 * Full table on desktop, condensed table (priority ≤ 2) on tablet, stacked cards on phones.
 * Desktop output is the existing `.table-container > table.data-table` markup.
 */
export function ResponsiveTable<T>({ columns, rows, rowKey, onRowClick, rowClassName, rowStyle, empty, cardActions, variant = 'auto', cardPriority = 2 }: ResponsiveTableProps<T>) {
  const { device } = useDevice();
  if (!rows.length && empty) return <>{empty}</>;

  if (device === 'mobile' || variant === 'cards') {
    const title = columns.find((c) => c.slot === 'title') || columns[0];
    const subtitle = columns.find((c) => c.slot === 'subtitle');
    const trailing = columns.find((c) => c.slot === 'trailing');
    const rest = columns.filter((c) => c !== title && c !== subtitle && c !== trailing && (c.priority ?? 1) <= cardPriority);
    const labelOf = (c: Column<T>) => c.mobileLabel ?? (typeof c.header === 'string' ? c.header : '');
    return (
      <div className="m-card-list">
        {rows.map((row) => (
          <MobileCard
            key={rowKey(row)}
            className={rowClassName?.(row)}
            style={rowStyle?.(row)}
            title={title.cell(row)}
            subtitle={subtitle?.cell(row)}
            trailing={trailing?.cell(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            actions={cardActions?.(row)}
          >
            {rest.length > 0 && rest.map((c) => {
              const label = labelOf(c);
              const value = c.cell(row);
              return label
                ? <KeyValue key={c.key} label={label}><span onClick={c.interactive ? (e) => e.stopPropagation() : undefined}>{value}</span></KeyValue>
                : <div key={c.key} className="m-card-extra" onClick={c.interactive ? (e) => e.stopPropagation() : undefined}>{value}</div>;
            })}
          </MobileCard>
        ))}
      </div>
    );
  }

  const visible = device === 'tablet' ? columns.filter((c) => (c.priority ?? 1) <= 2) : columns;
  const join = (...c: (string | undefined)[]) => c.filter(Boolean).join(' ') || undefined;
  const cls = (c: Column<T>) => join(c.align === 'right' ? 'num' : undefined, c.className);
  const thCls = (c: Column<T>) => join(c.align === 'right' ? 'num' : undefined, c.headerClassName);

  return (
    <div className="table-container">
      <table className="data-table">
        <thead><tr>{visible.map((c) => <th key={c.key} className={thCls(c)}>{c.header}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={join(onRowClick ? 'clickable' : undefined, rowClassName?.(row))}
              style={rowStyle?.(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {visible.map((c) => (
                <td key={c.key} className={cls(c)} onClick={c.interactive ? (e) => e.stopPropagation() : undefined}>{c.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ResponsiveTable;
