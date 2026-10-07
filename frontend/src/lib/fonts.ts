import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

// Applied on <html>; exposes --font-geist-sans / --font-geist-mono
// consumed by tailwind.config.ts's fontFamily.sans / fontFamily.mono.
export const fontVariables = `${GeistSans.variable} ${GeistMono.variable}`;