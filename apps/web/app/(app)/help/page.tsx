"use client";

import { PageShell } from "@aida/ui";
import { HelpDocs } from "@/components/help-docs";

export default function HelpPage() {
  return (
    <PageShell
      title="Data dictionary & analytics"
      eyebrow="Reference"
      subtitle="Human-readable reference: what each column means, how percentages and denominators work, validation rules, API routes, and which page loads which data."
      explainer={{
        what: "The single place to answer “what does this field mean?” and “where did this percentage come from?”",
        does: "Lists every DB column used in analytics, explains derived metrics, and maps UI pages to API payloads.",
      }}
    >
      <HelpDocs />
    </PageShell>
  );
}
