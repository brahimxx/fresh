"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children, ...props }) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="dark"
            storageKey="fresh-theme-preference"
            enableSystem={false}
            disableTransitionOnChange
            {...props}
        >
            {children}
        </NextThemesProvider>
    );
}
