"use client";

import { PageShell } from "@aida/ui";
import { HelpDocs } from "@/components/help-docs";

export default function HelpPage() {
  return (
    <PageShell
      title="Data dictionary & analytics"
      eyebrow="Reference"
      subtitle="Column-level documentation for the CHC assessment schema, derived metrics, validation rules, API behavior, and how each app page consumes the data."
    >
      <HelpDocs />
    </PageShell>
  );
}
