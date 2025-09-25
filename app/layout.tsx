import type { Metadata } from "next";
import "./globals.css";
import Navigation from "./components/Navigation"; // adjust path if needed

export const metadata: Metadata = {
  title: "Design Elixir Tools",
  description: "Tools I needed but couldn't find",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navigation layout="list" /> 
        <main>{children}</main>      
      </body>
    </html>
  );
}