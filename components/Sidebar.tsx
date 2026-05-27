"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavChild = { name: string; href: string };
type NavItem = { name: string; href: string; children?: NavChild[] };
type NavSection = { label: string; items: NavItem[] };

// ─── Navigation Structure ─────────────────────────────────────────────────────
// Edit this array to customize your sidebar. Each item maps to a page route.
// Children appear as indented sub-items when the parent is expanded.
const NAV: NavSection[] = [
  {
    label: "Core",
    items: [
      { name: "Dashboard", href: "/" },
      { name: "AI Assistant", href: "/assistant" },
      { name: "Projects", href: "/projects" },
      { name: "Notes", href: "/notes" },
    ],
  },
  {
    label: "Workspaces",
    items: [
      {
        name: "Intelligence",
        href: "/intelligence",
        children: [
          { name: "Research Reports", href: "/intelligence/reports" },
          { name: "Opportunities", href: "/intelligence/opportunities" },
        ],
      },
      {
        name: "Content",
        href: "/content",
        children: [
          { name: "Review Queue", href: "/review" },
          { name: "Blog Posts", href: "/content/posts" },
          { name: "Post Scorer", href: "/content/post-scorer" },
        ],
      },
      {
        name: "Growth",
        href: "/growth",
      },
      {
        name: "Business",
        href: "/business",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Agents", href: "/agents" },
      { name: "Settings", href: "/settings" },
    ],
  },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Sidebar() {
  const pathname = usePathname();

  // Auto-expand any section that contains the current route
  const defaultExpanded: Record<string, boolean> = {};
  for (const section of NAV) {
    for (const item of section.items) {
      if (!item.children) continue;
      if (item.children.some((child) => isActive(child.href, pathname))) {
        defaultExpanded[item.href] = true;
      }
    }
  }

  const [expanded, setExpanded] = useState<Record<string, boolean>>(defaultExpanded);

  const toggle = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  return (
    <aside className="w-[240px] bg-white border-r border-border px-[18px] py-7 flex flex-col sticky top-0 h-screen overflow-y-auto shrink-0">
      {/* Hub Name — update HUB_NAME in DESIGN.md, then change the text here */}
      <div className="font-serif text-[26px] text-dark mb-9 pl-2.5 tracking-tight leading-none">
        My <span className="text-primary">Hub</span>
      </div>

      <nav className="flex flex-col gap-5 flex-1">
        {NAV.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold tracking-widest text-muted uppercase mb-2 pl-2.5">
              {section.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href, pathname);
                const open = expanded[item.href];

                return (
                  <li key={item.href}>
                    <div className="flex items-center">
                      <Link
                        href={item.href}
                        className={`flex-1 flex items-center px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                          active
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-dark/70 hover:text-dark hover:bg-light"
                        }`}
                      >
                        {item.name}
                      </Link>
                      {item.children && (
                        <button
                          onClick={(e) => toggle(item.href, e)}
                          className="px-1.5 py-1.5 text-muted hover:text-dark rounded transition-colors"
                          aria-label={open ? "Collapse" : "Expand"}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            className={`transition-transform ${open ? "rotate-180" : ""}`}
                          >
                            <path
                              d="M2 4l4 4 4-4"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      )}
                    </div>

                    {item.children && open && (
                      <ul className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-3">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={`block px-2 py-1 rounded-md text-[13px] transition-colors ${
                                isActive(child.href, pathname)
                                  ? "text-primary font-medium"
                                  : "text-dark/60 hover:text-dark hover:bg-light"
                              }`}
                            >
                              {child.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
