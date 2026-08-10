# Recipe Cost & Margin Risk Dashboard

> Monitor a metric. Flag risk when it crosses a threshold. Applied to recipe costing.

A ten-week, self-taught project that carries one dataset through a complete
analytics pipeline — Excel → SQLite → Tableau → React → Python — and ends with a
tool that tells a small food business which of its recipes are quietly losing money.

**Built by [Harry (Hung) Ly](https://github.com/hungly2301)** — Financial Economics
(Math minor), Denison University — alongside a Risk Management & Compliance product
management internship at JPMorgan Chase, June–August 2026.
<img width="717" height="527" alt="Screenshot 2026-08-09 at 8 42 05 PM" src="https://github.com/user-attachments/assets/629e7f45-95aa-4720-86ae-def6460bb2e4" />
<img width="1143" height="808" alt="Screenshot 2026-08-09 at 8 53 09 PM" src="https://github.com/user-attachments/assets/3e01b8c4-4ed9-418e-bd44-a9eaf324a95a" />
<img width="514" height="414" alt="Screenshot 2026-08-09 at 8 54 04 PM" src="https://github.com/user-attachments/assets/43e8e855-c263-493e-8037-a0a1238969e6" />

<!-- TODO: add a screenshot of the Overview tab here. Drag the image into this
     file on github.com and GitHub![Uploading Screenshot 2026-08-09 at 8.42.05 PM.png…]()
 will upload it and insert the link for you. -->

---

## The problem

Small food businesses price by intuition. Ingredient costs drift week to week, and a
recipe that was profitable in January can quietly become a loss-leader by June — the
damage compounding across hundreds of sales before anyone notices.

That is structurally the same problem a compliance monitoring tool solves: a metric
moves, a threshold exists, and somebody needs to be told *before* the breach becomes
expensive. This project builds that pattern end to end, wearing a recipe-costing
hobby project's clothes.

**Core formula:** `Margin % = (Selling Price − Cost Per Serving) / Selling Price`
**Thresholds are persona-specific:** 20% for a home baker, 10% for a café owner and
a caterer.

## The pipeline

| Stage | Tool | What it produces |
|---|---|---|
| Data model | Excel | Three-table relational model — 21 ingredients, 10 recipes, 57-row junction table |
| Queries | SQLite | Schema with foreign keys, plus views for cost, margin, threshold breaches |
| History | SQLite | 12 weeks of prices; `LAG()` window functions detect week-over-week spikes |
| Reporting | Tableau Public | Five-sheet dashboard: cost breakdown, margin trend, risk table, price heatmap, risk scatter |
| Simulation | React | Live "what-if" console — price shocks, recipe editing, compliance alert panel |
| Automation | Python | Regenerates price history and every downstream export from one command |

Each stage is a real, independently shareable artifact rather than a throwaway step.

## Links

- **Tableau Public dashboard:** (https://public.tableau.com/views/RCMRDashBoard/Dashboard1?:language=en-US&publish=yes&:sid=&:redirect=auth&:display_count=n&:origin=viz_share_link)
- **Interactive React console:** https://hungly2301.github.io/Recipe-Cost-Margin-Risk/

## Repository layout

```
data/          Source CSVs and the derived exports Tableau reads
excel/         Week 2 relational model (.xlsx)
sql/           Schema, views, and the SQLite database file
tableau/       Tableau workbook (.twb)
app/           React console (RCMRConsole.jsx)
automation/    Python scripts (Week 9)
```

## Running the automation

No dependencies required for the main script — it uses only Python's standard library.

```bash
cd automation
python3 update_prices.py --dry-run     # preview
python3 update_prices.py               # add one week, rebuild all exports
python3 update_prices.py --weeks 4     # simulate a month ahead
python3 update_prices.py --rebuild-only  # recompute exports without adding prices
```

The script appends a new week of prices, then regenerates every file the Tableau
dashboard depends on and prints a risk summary — including any recipe that crossed
its threshold on that run.

The optional API demo needs one library:

```bash
pip install requests
export BLS_API_KEY="your-key"   # free at data.bls.gov/registrationEngine
python3 bls_demo.py
```

## Two things I got wrong, and what they taught me

**The BI layer had silently drifted from the source data.** The price history was
expanded from 4 tracked ingredients to all 21 partway through the project, but the
CSV exports feeding Tableau were generated *before* that change and never
regenerated. The dashboard was displaying spikes — including a 922% jump on
blueberries — computed from data that no longer existed. Nothing errored. Nothing
looked broken. It was only caught by recomputing the exports from source and
comparing.

That is a data lineage failure, and it is the real argument for the Week 9 script:
hand-generated exports drift, and drift is invisible. `update_prices.py` now rebuilds
every downstream file from the source in a single command, so the dashboard cannot
disagree with the database.

**Real external data isn't automatically better data.** The plan was to pull live
grocery prices from the Bureau of Labor Statistics API. The API itself was
straightforward. The problem was everything after it: BLS publishes *national
average* prices *monthly* in *pounds and dozens*, while this project tracks *one
buyer's vendor* prices *weekly* in *grams and millilitres*. Only 8 of 21 ingredients
had a matching series at all, and BLS's own guidance warns that average prices
measure the level in a given month, not change over time.

Substituting those numbers would have shifted every cost in the project and
destroyed the deliberate test case — Lemon Bars, at 9.1% margin — that had validated
every stage since Week 2. So the API work lives in `bls_demo.py` as a genuine
integration against a real government endpoint, kept deliberately separate from the
pipeline. Choosing not to wire it in was the more defensible product decision than
wiring it in would have been.

## Known limitations (v1)

- Ingredient cost only — no labor or overhead in the margin formula
- One vendor per ingredient; no multi-vendor cost comparison
- Spoilage and over-ordering are treated as inventory problems, out of scope
- Price history after week 12 is synthetically generated, not observed

## What v2 would add

- A labor-cost field, which would change every margin number in the project
- Per-vendor cost tracking, so substitution decisions can compare suppliers
- Deployment of the React console to a public URL
- Scheduled execution of the update script rather than manual runs

---

*The product thinking is the point. The tools were the excuse to practice it.*
