import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { VERSION } from '@/lib/version';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: `SLV Barley Shop - Admin Dashboard ${VERSION}`,
  description: "Professional admin dashboard for SLV Barley Shop ecommerce platform - Manage products, bundles, and more",
  keywords: "ecommerce, admin, dashboard, products, bundles, management",
  authors: [{ name: "SLV Barley Shop" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <ErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
