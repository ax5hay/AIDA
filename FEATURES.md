# AIDA — features and functionality

Single catalog of what the product does (UI, API, packages, and data). Items are not split into “legacy” vs “new”; everything listed is part of the current system.

| Feature | What it does |
|--------|----------------|
| **Landing (`/`)** | Marketing-style entry with navigation into the signed-in app. |
| **App shell & navigation** | Shared layout with primary nav (overview, analytics, program sections, explorer, correlations, AI, help, settings). |
| **Decision support dock (global)** | Collapsible bottom panel on all in-app pages: **Top 5 actions** (gaps, correlations, anomalies, pipeline, trends), **program health score** 0–100 with coverage / outcomes / gap-equity breakdown, **alert center** (thresholds, anomaly density, district clusters, validation), **what-if** scenarios (illustrative elasticity — not forecasts), **data quality** (missing core sections %, validation count, suspicious flags), **benchmarking** (half-window deltas + worst/best districts), **story mode** (five-step narrative). Uses `GET /analytics/decision-support`; auto-refresh ~60s when open. Same URL filters as every other dashboard. |
| **URL-synced analytics filters** | `from`, `to`, `district`, `facilityId` stored in the query string so views are shareable and refresh-safe — all dashboards and the decision dock stay in sync. |
| **Program overview (`/overview`)** | Dashboard: assessment count, screening coverage KPIs (ANC denominators), mortality and neonatal rates, institutional delivery mix, LBW and preterm rates, management-gap summary, rule-based alerts, validation issue count, and links into deeper views. |
| **Analytics suite (`/analytics`)** | Evidence panel: deterministic KPI cards, district screening comparison (HIV and Hb×4 vs summed ANC), reporting funnel bars, scatter plots (ANC vs Hb×4, ANC vs HIV, pregnancy anemia vs live births, preconception anemia identified vs managed), correlation heatmap matrix. |
| **Public health intelligence (Analytics suite)** | Server endpoint aggregates filtered assessments into: four standardized pipelines (preconception, pregnancy, postnatal, infant) with stage counts, conversion, drop-off, bottleneck; Sankey-style flow links for pregnancy; gap analytics (screening, treatment, outcome proxies) and district severity ranking; Pearson/Spearman presets, extended correlation matrix, χ² and risk ratio for sample pairs; monthly-aligned cohort tables and retention proxy; time series with moving averages, trend classification, seasonality index, spike indices; distribution shares (BMI bands, anemia, birth weight); multivariate bubble and OGTT scatter; KPI deltas across window halves; combined anomalies (z-score, IQR, isolation-style on HIV tests); mother–infant and lifecycle linkage summaries; deterministic **what / why / next** insight blocks; optional on-page button to request an LLM layer on top of that JSON. |
| **Correlations page (`/correlations`)** | Focused view for correlation analysis aligned with the same filters. |
| **Preconception (`/preconception`)** | Section charts and tables for preconception identified, interventions, and managed cohorts. |
| **Pregnancy (`/pregnancy`)** | ANC registered/screened, identified, and managed sections. |
| **Postnatal (`/postnatal`)** | Postnatal women section (checkups, HBNC, nutrition, psychosocial, etc.). |
| **Infants (`/infants`)** | Infants 0–24 months section (nutrition, growth, immunization, WASH). |
| **Outcomes (`/outcomes`)** | Delivery and outcomes section (deliveries, deaths, birth weight, preterm). |
| **High-risk (`/high-risk`)** | High-risk pregnancy flags. |
| **Explorer (`/explorer`)** | Filtered listing of assessments with facility, period, remarks/document metadata, and quick numeric preview; navigation to detail. |
| **Assessment detail (`/explorer/[id]`)** | Full numeric sections for one assessment, remarks, document slots, and row-level validation messages. |
| **AI insights (`/ai`)** | Optional LLM narratives using the **same filters** as analytics: (1) narrative from **program overview** JSON, (2) narrative from **full intelligence** JSON (`POST /ai/intelligence-insights`), with browser-side opt-in, model selection when LM Studio is configured, and graceful fallbacks when AI is disabled or the model returns nothing. |
| **Help (`/help`)** | Field-level documentation aligned with Prisma schema, derived metrics, validation rules, API route summary, and page→data mapping. |
| **Settings (`/settings`)** | Public API/config surface (version, AI flags, default bases) for operators. |
| **API: `GET /v1/analytics/overview`** | Cached KPIs, funnel, alerts, validation list for filtered facility assessment rows. |
| **API: `GET /v1/analytics/section/:section`** | Per-section totals, field metrics, comparative distribution, monthly time series. |
| **API: `GET /v1/analytics/intelligence`** | Extended public health intelligence payload (pipelines through cross-entity links); cached separately (~60s). |
| **API: `GET /v1/analytics/decision-support`** | Decision layer only: prioritized actions, composite health score, alerts, what-if, data quality, benchmarks, story steps; cached ~45s. |
| **API: `GET /v1/analytics/correlations`** | Anemia vs BMI series and correlation matrix glue. |
| **API: `GET /v1/analytics/district-rollup`** | District-level aggregates for charts. |
| **API: `GET /v1/analytics/clinical-cross-section`** | Scatter-ready paired series per assessment. |
| **API: `GET /v1/analytics/anomalies`** | Z-score anomaly flags for `live_births` or `maternal_deaths`. |
| **API: `GET /v1/analytics/explorer`** | Lightweight list rows for explorer UI. |
| **API: `GET /v1/analytics/assessments/:id`** | Full assessment payload for detail view. |
| **API: `GET /v1/facilities`** | Facility list for filters and labels. |
| **API: `GET /v1/facilities/districts`** | District list for filter dropdown. |
| **API: `POST /v1/ingestion/assessments`** | Programmatic create/update of assessments. |
| **API: `GET /v1/metrics/health`** | Health check for orchestration and load balancers. |
| **API: `GET /v1/metrics/counts`** | Database row counts for operations. |
| **API: `GET /v1/config`** | Non-secret client configuration (AI toggles, LM Studio hints, API base). |
| **API: `GET /v1/ai/status`** | Whether server-side AI is enabled. |
| **API: `GET /v1/ai/models`** | Proxies LM Studio model list when configured. |
| **API: `POST /v1/ai/insights`** | OpenAI-compatible chat completion over a client-supplied JSON snapshot (typically overview). |
| **API: `POST /v1/ai/intelligence-insights`** | Returns deterministic `insights` from the payload and optional LLM text grounded in the full intelligence snapshot. |
| **Package `@aida/db`** | Prisma schema and generated client; one assessment row per facility × reporting window. |
| **Package `@aida/analytics-engine`** | Canonical field lists, aggregation, derived rates (screening, mortality, LBW, preterm, institutional mix), validation helpers, funnel/pipeline helpers, statistical utilities (Spearman, gaps, χ², risk ratio, trends, seasonality, regression), deterministic narrative blocks, **decision-support** helpers (program health score, top actions, alert list, what-if templates, story steps). |
| **Package `@aida/ml-engine`** | Correlation matrix helper, z-score anomalies, IQR outliers, isolation-style 1D scores. |
| **Package `@aida/ai-engine`** | OpenAI-compatible client (LM Studio primary, optional OpenAI), env-based configuration. |
| **Package `@aida/ui`** | Shared layout primitives (`PageShell`, etc.) and styling helpers used by the web app. |
| **Web → API proxy (dev)** | Next.js rewrites `/api/*` to the Nest port so the browser can call `/api/v1/...` without CORS friction during local dev. |
| **Server-side response cache** | Nest cache manager: short TTL on hot analytics routes to protect the database under repeated dashboard loads. |
| **Docker / `run.sh`** | Optional one-command bring-up of web, API, and Postgres for demos and CI-like environments. |

For architecture and setup commands, see [README.md](./README.md).
