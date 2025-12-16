import localFont from "next/font/local";
import "./globals.css";

/* =========================
   Fonts (Performance First)
========================= */
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

/* =========================
   SEO Metadata (2025 Ready)
========================= */
export const metadata = {
  metadataBase: new URL("https://bennyhinn.life"),

  title: {
    default: "Benny Hinn Mathew | Software Engineer",
    template: "%s | Benny Hinn Mathew",
  },

  description:
    "Benny Hinn Mathew is a Nairobi-based software engineer specializing in scalable web systems, full-stack development, and modern cloud architectures.",

  keywords: [
    "Benny Hinn Mathew",
    "Software Engineer Nairobi",
    "Fullstack Developer Kenya",
    "Next.js Developer",
    "Flask Developer",
    "Web Systems Engineer",
  ],

  authors: [{ name: "Benny Hinn Mathew", url: "https://bennyhinn.life" }],
  creator: "Benny Hinn Mathew",
  publisher: "Benny Hinn Mathew",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },

  alternates: {
    canonical: "https://bennyhinn.life",
  },

  openGraph: {
    title: "Benny Hinn Mathew | Software Engineer",
    description:
      "Full Stack software engineer building scalable, production-ready web systems.",
    url: "https://bennyhinn.life",
    siteName: "Benny Hinn Mathew",
    images: [
      {
        url: "/benny-logo.jpeg",
        width: 1200,
        height: 630,
        alt: "Benny Hinn Mathew Portfolio",
      },
    ],
    locale: "en_KE",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Benny Hinn Mathew | Software Engineer",
    description:
      "Building scalable full-stack systems with modern web technologies.",
    images: ["/benny-logo.jpeg"],
  },

  category: "technology",
};

/* =========================
   Root Layout
========================= */
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        {/* Performance & UX */}
        <meta name="theme-color" content="#020617" />
        <meta
          name="google-site-verification"
          content="TMLXDjwIrq-79d1OYe7uG3lZVOP0rcxDXQYiB1lPo7M"
        />
        <link rel="icon" href="/favicon.ico" />

        {/* Preload critical assets */}
        <link
          rel="preload"
          href="/fonts/GeistVF.woff"
          as="font"
          type="font/woff"
          crossOrigin="anonymous"
        />
      </head>

      <body className="antialiased bg-[#020617] text-slate-100">
        {/* Semantic landmark for SEO */}
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
