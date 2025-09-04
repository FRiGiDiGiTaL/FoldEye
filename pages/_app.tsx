// pages/_app.tsx
import type { AppProps } from "next/app";
import "../styles/globals.css"; // import your global CSS (if you have one)

// This component wraps ALL pages in your app
export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
