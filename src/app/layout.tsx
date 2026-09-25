import type { Metadata } from "next";

import { STORE_NAME, STORE_TAGLINE } from "@/lib/store-config";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: STORE_NAME, template: `%s | ${STORE_NAME}` },
  description: STORE_TAGLINE,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
