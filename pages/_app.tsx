// pages/_app.tsx
import type { AppProps } from "next/app";
import Head from "next/head";
import "../styles/globals.css"; // ✅ Make sure Tailwind/global styles are loaded

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>BookfoldAR</title>
        <meta
          name="description"
          content="BookfoldAR - Augmented reality-assisted precision book folding"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
