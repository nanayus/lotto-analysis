import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { createTabBarScrollTracker, trackTabBarScroll } from './tabBarScrollTracker';

type TabBarVisibilityContextValue = {
  hidden: boolean;
  hide: () => void;
  show: () => void;
};

const defaultContextValue: TabBarVisibilityContextValue = {
  hidden: false,
  hide: () => undefined,
  show: () => undefined,
};

const TabBarVisibilityContext = createContext(defaultContextValue);

export function TabBarVisibilityProvider({ children }: PropsWithChildren) {
  const [hidden, setHidden] = useState(false);
  const hide = useCallback(() => setHidden(true), []);
  const show = useCallback(() => setHidden(false), []);
  const value = useMemo(() => ({ hidden, hide, show }), [hidden, hide, show]);

  return (
    <TabBarVisibilityContext.Provider value={value}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility() {
  return useContext(TabBarVisibilityContext);
}

export function useAutoHideTabBar() {
  const { hide, show } = useTabBarVisibility();
  const trackerRef = useRef(createTabBarScrollTracker());

  useEffect(() => {
    trackerRef.current = createTabBarScrollTracker();
    show();
    return () => show();
  }, [show]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const result = trackTabBarScroll(trackerRef.current, event.nativeEvent.contentOffset.y);
    trackerRef.current = result.tracker;
    if (result.action === 'hide') hide();
    if (result.action === 'show') show();
  }, [hide, show]);

  return useMemo(() => ({ onScroll, scrollEventThrottle: 16 as const }), [onScroll]);
}
