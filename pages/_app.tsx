// pages/_app.tsx
import type { AppProps } from "next/app";

// ✅ Import global styles
import "../styles/globals.css";

// ✅ Import your custom glassmorphism UI styles
import "../glassmorphism.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
