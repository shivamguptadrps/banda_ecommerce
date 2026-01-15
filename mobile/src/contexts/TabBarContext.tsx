import React, { createContext, useContext, useState, ReactNode } from "react";

interface TabBarContextType {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
}

const TabBarContext = createContext<TabBarContextType | undefined>(undefined);

export function TabBarProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <TabBarContext.Provider value={{ isVisible, setIsVisible }}>
      {children}
    </TabBarContext.Provider>
  );
}

export function useTabBar() {
  const context = useContext(TabBarContext);
  // Return default values if context is not available
  if (!context) {
    return {
      isVisible: true,
      setIsVisible: () => {},
    };
  }
  return context;
}
