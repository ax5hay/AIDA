import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help — Data dictionary & analytics",
  description:
    "CHC assessment column reference, derived metrics, validation rules, and how AIDA uses each field.",
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
