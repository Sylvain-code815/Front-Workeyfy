import { createContext, useContext, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';

type PageThemeValue = {
    theme: Theme;
    setTheme: (t: Theme) => void;
};

const PageThemeContext = createContext<PageThemeValue>({
    theme: 'dark',
    setTheme: () => {},
});

export function PageThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>('dark');
    return (
        <PageThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </PageThemeContext.Provider>
    );
}

export function usePageTheme() {
    return useContext(PageThemeContext);
}
