"use client";

import Link from "next/link";
import Image from "next/image";
// Define the type for navigation items
export interface NavItem {
  title: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { title: "CSS Formatter", href: "/css-formatter", icon: "/css.png" },
  { title: "Paragraph Cleaner", href: "/paragraph-cleaner", icon: "/paragraph.svg" },
];

interface NavigationProps {
  layout?: "grid" | "list"; // Defaults to list
}

export default function Navigation({ layout = "list" }: NavigationProps) {
  return (
    <nav
      className={
        layout === "list"
          ? "flex-start-start flex-wrap"
          : "flex-start-start flex-wrap"
      }
    >
      {navItems.map((item, idx) => (
        <div
          key={idx}
          className={layout === "list" ? "nav-list-wrapper flex-center-center" : "nav-grid-wrapper flex-center-center"}
        >
          <Link href={item.href} className="no-link-styling flex-center-center flex-column">
            <div className="icon-bg" style={{backgroundImage: 'url(' + item.icon + ')'}}></div>
            <h3 className="centered-text">{item.title}</h3>
          </Link>
        </div>
      ))}
    </nav>
  );
}