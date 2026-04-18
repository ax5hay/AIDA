"use client";

import { PageShell } from "@aida/ui";
import { HelpDocs } from "@/components/help-docs";

export default function HelpPage() {
  return (
    <PageShell
      title="Data dictionary & analytics"
      eyebrow="Reference"
      subtitle="Human-readable reference: what each column means, how percentages and denominators work, validation rules, and which screens emphasize which parts of the programme."
      explainer={{
        what: "The single place to answer “what does this field mean?” and “where did this percentage come from?”",
        does: "Lists every stored field used in dashboards, explains derived metrics, and maps screens to the programme views they draw on.",
      }}
    >
      <HelpDocs />
    </PageShell>
  );
}
