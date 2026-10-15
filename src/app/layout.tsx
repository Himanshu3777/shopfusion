import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ToastProvider } from "@/components/ui";

export const metadata: Metadata = {
  title: { default: "ShopFusion — Discover, Shop & Sell", template: "%s · ShopFusion" },
  description: "ShopFusion is an original online marketplace for electronics, fashion, home, beauty and grocery. Shop deals, track orders, and sell with confidence.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "ShopFusion",
    description: "An original online marketplace — discover, shop and sell with confidence.",
    type: "website",
  },
};

const themeScript = `(function(){try{var t=localStorage.getItem('sf-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ToastProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
