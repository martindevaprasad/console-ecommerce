import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Per-page shell metadata. The mobile/tablet shell renders its top bar from this.
 * Pages that do nothing get sensible defaults from the nav config (lib/nav.tsx).
 *
 *   usePageMeta({ title: 'Order #912', back: '/orders', actions: <button…/> });
 */
export interface PageMeta {
  /** Title shown in the top bar (defaults to the nav label) */
  title?: string;
  /** Path (or -1 for history back) for the top bar back chevron; omit on top-level pages */
  back?: string | -1;
  /** Up to two icon buttons on the right of the mobile top bar */
  actions?: React.ReactNode;
  /**
   * The page renders its own large title (PageHeader). The compact top-bar title then
   * only fades in once the large title scrolls away, like iOS. Default: true.
   */
  largeTitle?: boolean;
  /** Hide the bottom tab bar (full-screen flows such as checkout) */
  hideTabBar?: boolean;
}

interface Ctx { meta: PageMeta; setMeta: (m: PageMeta | null) => void }
const PageMetaContext = createContext<Ctx>({ meta: {}, setMeta: () => {} });

export const PageMetaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [meta, setMetaState] = useState<PageMeta>({});
  const setMeta = useCallback((m: PageMeta | null) => setMetaState(m || {}), []);
  const value = useMemo(() => ({ meta, setMeta }), [meta, setMeta]);
  return <PageMetaContext.Provider value={value}>{children}</PageMetaContext.Provider>;
};

/** Declare this page's shell metadata. Cleared automatically when the page unmounts. */
export function usePageMeta(meta: PageMeta, deps: React.DependencyList = []) {
  const { setMeta } = useContext(PageMetaContext);
  useEffect(() => {
    setMeta(meta);
    return () => setMeta(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Read by the shell. */
export const usePageMetaValue = () => useContext(PageMetaContext).meta;
