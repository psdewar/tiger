import type { Metadata } from "next";
export const metadata: Metadata = { title: "Tiger API", description: "Stripe control plane" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: "2rem", background: "#111", color: "#eee" }}>
        {children}
      </body>
    </html>
  );
}
