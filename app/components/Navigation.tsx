"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

// Define the type for navigation items
export interface NavItem {
  title: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { title: "CSS Formatter", href: "/css-formatter", icon: "/css.png" },
  { title: "Paragraph Cleaner", href: "/paragraph-cleaner", icon: "/paragraph.svg" },
  { title: "QR Code Generator", href: "/qr-code-generator", icon: "/qr-code.svg"},
  { title: "Client List", href: "/client-list", icon: "/qr-code.svg"},
  { title: "Time Tracker", href: "/time-tracking", icon: "/qr-code.svg"}
];

interface NavigationProps {
  layout?: "grid" | "list"; // Defaults to list
}

export default function Navigation({ layout = "list" }: NavigationProps) {
  const pathname = usePathname();

  return (
    <nav className={layout === "list" ? "nav-list-wrapper flex-center-start" : "nav-grid-wrapper flex-center-center"}>

      {navItems.map((item, idx) => {
        const isActive = pathname === item.href;
        return (
          <div key={idx} className={layout === "list" ? "list-link flex-center-center no-flex-grow" : "grid-link flex-center-center"} >

            <Link href={item.href} className={`no-link-styling flex-center-center flex-column ${isActive ? 'active-link' : ''}`} >
              <div className="icon-bg" style={{backgroundImage: 'url(' + item.icon + ')'}}></div>
              <h3 style={{fontSize: '12px'}} className="centered-text no-text-spacing">{item.title}</h3>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}