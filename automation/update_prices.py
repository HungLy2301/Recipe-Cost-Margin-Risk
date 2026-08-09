#!/usr/bin/env python3
"""
update_prices.py — Recipe Cost & Margin Risk Dashboard, Week 9 automation.

WHAT THIS DOES
--------------
1. Reads the current Price_History CSV (the source of truth for weekly prices).
2. Generates the next week's prices for all 21 ingredients using realistic
   category-based drift, and appends them.
3. Regenerates every downstream file that Tableau reads, so the BI layer can
   never silently drift away from the source data again:
       - margin_weekly_percent.csv   (margin % per recipe per week)
       - Price_Most_Change.csv       (week-over-week price jumps > 10%)
       - Impact_Likelihood.csv       (risk scatter: likelihood x impact)
       - Recipe_Cost.csv             (latest-week batch cost per recipe)
       - Margin_Pct.csv              (latest-week margin % per recipe)
       - Recipe_Under_Threshold.csv  (recipes currently AT RISK)
4. Prints a compliance-style summary: what moved, what got flagged, and any
   recipe that crossed its persona threshold this week.

WHY NO pandas / requests
------------------------
This script uses only Python's standard library, so it runs on a stock macOS
Python with zero `pip install`. Fewer moving parts = fewer things to debug.

USAGE
-----
    python3 update_prices.py                 # add one week
    python3 update_prices.py --weeks 4       # add four weeks
    python3 update_prices.py --dry-run       # show what would happen, write nothing
    python3 update_prices.py --seed 7        # different random draw (reproducible)
    python3 update_prices.py --rebuild-only  # don't add a week, just fix stale exports
"""

import argparse
import csv
import os
import random
from datetime import date, timedelta

# --------------------------------------------------------------------------
# CONFIG — file names and business rules live here, not buried in the code.
# --------------------------------------------------------------------------

DATA_DIR = "."  # run this from the folder holding your CSVs, or pass --data-dir

INGREDIENTS_FILE = "Ingredients.csv"
RECIPES_FILE = "Recipes.csv"
RECIPE_INGREDIENTS_FILE = "Recipe_Ingredients.csv"
PRICE_HISTORY_FILE = "Price_History_all21_mock.csv"

# Persona margin thresholds, straight from the PRD.
THRESHOLDS = {"Mai": 0.20, "Daniel": 0.10, "Albert": 0.10}
DEFAULT_THRESHOLD = 0.10

# The alert rule from US-2/AC2: flag a price rise greater than +10%.
SPIKE_THRESHOLD = 0.10

# How volatile is each ingredient category, week over week?
# (mean drift, standard deviation) as decimal fractions.
# Produce swings hardest; dry goods creep; water and ice never move.
CATEGORY_VOLATILITY = {
    "Produce":           (0.004, 0.045),
    "Protein":           (0.003, 0.030),
    "Dairy":             (0.002, 0.020),
    "Dry Goods":         (0.001, 0.010),
    "Free/Negligible":   (0.000, 0.000),
}
FALLBACK_VOLATILITY = (0.001, 0.012)

# Occasionally a real supply shock happens. ~4% of ingredient-weeks.
SHOCK_PROBABILITY = 0.04
SHOCK_RANGE = (0.12, 0.30)  # a shock adds +12% to +30%


# --------------------------------------------------------------------------
# READING
# --------------------------------------------------------------------------

def read_csv(path):
    """Read a CSV into a list of dictionaries (one per row)."""
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def load_data(data_dir):
    ingredients = read_csv(os.path.join(data_dir, INGREDIENTS_FILE))
    recipes = read_csv(os.path.join(data_dir, RECIPES_FILE))
    recipe_ingredients = read_csv(os.path.join(data_dir, RECIPE_INGREDIENTS_FILE))
    price_history = read_csv(os.path.join(data_dir, PRICE_HISTORY_FILE))
    return ingredients, recipes, recipe_ingredients, price_history


def build_price_lookup(price_history):
    """
    Turn the flat price history into a dictionary we can query fast:
        prices[("ING001", 3)] -> 0.002192
    """
    prices = {}
    for row in price_history:
        key = (row["Ingredient_ID"], int(row["Week_Number"]))
        prices[key] = float(row["Cost_Per_Unit"])
    return prices


# --------------------------------------------------------------------------
# GENERATING THE NEXT WEEK
# --------------------------------------------------------------------------

def next_week_date(price_history, new_week_number):
    """Find week 1's date and step forward 7 days per week."""
    week_one = min(price_history, key=lambda r: int(r["Week_Number"]))
    start = date.fromisoformat(week_one["Week_Date"])
    return (start + timedelta(weeks=new_week_number - 1)).isoformat()


def generate_week(ingredients, prices, last_week, new_week, week_date, rng):
    """
    Produce one new row per ingredient for `new_week`, drifting from the
    previous week's price. Returns (rows, list_of_shock_notes).
    """
    rows = []
    shocks = []

    for ing in ingredients:
        ing_id = ing["Ingredient_ID"]
        previous = prices.get((ing_id, last_week))
        if previous is None:
            # Ingredient has no history yet — seed it from the master list.
            previous = float(ing["Cost_Per_Unit"])

        mean, sd = CATEGORY_VOLATILITY.get(ing["Category"], FALLBACK_VOLATILITY)

        if sd == 0:
            change = 0.0  # water and ice hold steady
        else:
            change = rng.gauss(mean, sd)
            if rng.random() < SHOCK_PROBABILITY:
                shock = rng.uniform(*SHOCK_RANGE)
                change += shock
                shocks.append((ing["Ingredient_Name"], change))

        new_price = previous * (1 + change)

        # Prices are costs — never let one go to zero or negative.
        new_price = max(new_price, previous * 0.5)

        # Match the precision already used in the file.
        new_price = round(new_price, 6)

        rows.append({
            "Ingredient_ID": ing_id,
            "Ingredient_Name": ing["Ingredient_Name"],
            "Week_Number": new_week,
            "Week_Date": week_date,
            "Cost_Per_Unit": new_price,
            "Note": "auto-generated",
        })
        prices[(ing_id, new_week)] = new_price

    return rows, shocks


# --------------------------------------------------------------------------
# THE CORE BUSINESS FORMULAS (identical to Excel / SQL / the React app)
# --------------------------------------------------------------------------

def batch_cost(recipe_id, recipe_ingredients, prices, week):
    """Total_Batch_Cost = SUM(Quantity_Used x Cost_Per_Unit) for that week."""
    total = 0.0
    for line in recipe_ingredients:
        if line["Recipe_ID"] != recipe_id:
            continue
        unit_cost = prices.get((line["Ingredient_ID"], week))
        if unit_cost is None:
            continue
        total += float(line["Quantity_Used"]) * unit_cost
    return total


def margin_pct(recipe, cost):
    """Margin_% = (Selling_Price - Cost_Per_Serving) / Selling_Price."""
    yield_qty = float(recipe["Yield"])
    price = float(recipe["Selling_Price"])
    if yield_qty == 0 or price == 0:
        return 0.0
    cost_per_serving = cost / yield_qty
    return (price - cost_per_serving) / price


def threshold_for(recipe):
    return THRESHOLDS.get(recipe["Persona_Type"], DEFAULT_THRESHOLD)


# --------------------------------------------------------------------------
# REBUILDING THE DOWNSTREAM EXPORTS
# --------------------------------------------------------------------------

def write_csv(path, fieldnames, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def rebuild_exports(data_dir, ingredients, recipes, recipe_ingredients, prices, all_weeks):
    """Regenerate every file Tableau reads, from the current price history."""
    latest = max(all_weeks)
    written = []

    # ---- margin_weekly_percent.csv : margin per recipe per week -----------
    margin_rows = []
    for week in all_weeks:
        for recipe in recipes:
            cost = batch_cost(recipe["Recipe_ID"], recipe_ingredients, prices, week)
            margin_rows.append({
                "Recipe_Name": recipe["Recipe_Name"],
                "Week_Number": week,
                "Margin_W_Pct": margin_pct(recipe, cost),
            })
    margin_rows.sort(key=lambda r: (r["Recipe_Name"], r["Week_Number"]))
    path = os.path.join(data_dir, "margin_weekly_percent.csv")
    write_csv(path, ["Recipe_Name", "Week_Number", "Margin_W_Pct"], margin_rows)
    written.append(("margin_weekly_percent.csv", len(margin_rows)))

    # ---- Price_Most_Change.csv : week-over-week jumps above +10% ----------
    # This is the Python equivalent of your Week 4 LAG() window function.
    spike_rows = []
    spike_counts = {}
    for ing in ingredients:
        ing_id = ing["Ingredient_ID"]
        for week in all_weeks[1:]:
            previous = prices.get((ing_id, week - 1))
            current = prices.get((ing_id, week))
            if previous is None or current is None or previous == 0:
                continue
            change = (current - previous) / previous
            if change > SPIKE_THRESHOLD:
                spike_rows.append({
                    "Ingredient_ID": ing_id,
                    "Week_Number": week,
                    "Price_Change": round(change, 6),
                })
                spike_counts[ing_id] = spike_counts.get(ing_id, 0) + 1
    path = os.path.join(data_dir, "Price_Most_Change.csv")
    write_csv(path, ["Ingredient_ID", "Week_Number", "Price_Change"], spike_rows)
    written.append(("Price_Most_Change.csv", len(spike_rows)))

    # ---- Impact_Likelihood.csv : the Week 5-6 risk scatter -----------------
    # Likelihood = share of weeks where this ingredient spiked above +10%.
    # Impact     = average share of a recipe's cost this ingredient represents.
    transitions = max(len(all_weeks) - 1, 1)
    impact_rows = []
    for ing in ingredients:
        ing_id = ing["Ingredient_ID"]
        likelihood = spike_counts.get(ing_id, 0) / transitions

        shares = []
        for recipe in recipes:
            total = batch_cost(recipe["Recipe_ID"], recipe_ingredients, prices, latest)
            if total == 0:
                continue
            for line in recipe_ingredients:
                if line["Recipe_ID"] == recipe["Recipe_ID"] and line["Ingredient_ID"] == ing_id:
                    unit_cost = prices.get((ing_id, latest), 0.0)
                    shares.append(float(line["Quantity_Used"]) * unit_cost / total)
        impact = sum(shares) / len(shares) if shares else 0.0

        impact_rows.append({
            "Ingredient_Name": ing["Ingredient_Name"],
            "Likelihood": likelihood,
            "Impact": impact,
        })
    path = os.path.join(data_dir, "Impact_Likelihood.csv")
    write_csv(path, ["Ingredient_Name", "Likelihood", "Impact"], impact_rows)
    written.append(("Impact_Likelihood.csv", len(impact_rows)))

    # ---- Recipe_Cost.csv / Margin_Pct.csv / Recipe_Under_Threshold.csv ----
    cost_rows, margin_now_rows, at_risk_rows = [], [], []
    for recipe in recipes:
        cost = batch_cost(recipe["Recipe_ID"], recipe_ingredients, prices, latest)
        margin = margin_pct(recipe, cost)
        cost_rows.append({
            "Recipe_ID": recipe["Recipe_ID"],
            "Recipe_Cost": round(cost, 6),
        })
        margin_now_rows.append({
            "Recipe_ID": recipe["Recipe_ID"],
            "Recipe_Name": recipe["Recipe_Name"],
            "Recipe_Cost": round(cost, 6),
            "Margin_Pct": margin,
        })
        if margin < threshold_for(recipe):
            at_risk_rows.append({
                "Recipe_Name": recipe["Recipe_Name"],
                "Persona_Type": recipe["Persona_Type"],
                "Margin_Pct": margin,
            })

    write_csv(os.path.join(data_dir, "Recipe_Cost.csv"),
              ["Recipe_ID", "Recipe_Cost"], cost_rows)
    written.append(("Recipe_Cost.csv", len(cost_rows)))

    write_csv(os.path.join(data_dir, "Margin_Pct.csv"),
              ["Recipe_ID", "Recipe_Name", "Recipe_Cost", "Margin_Pct"], margin_now_rows)
    written.append(("Margin_Pct.csv", len(margin_now_rows)))

    write_csv(os.path.join(data_dir, "Recipe_Under_Threshold.csv"),
              ["Recipe_Name", "Persona_Type", "Margin_Pct"], at_risk_rows)
    written.append(("Recipe_Under_Threshold.csv", len(at_risk_rows)))

    return written, at_risk_rows, spike_rows


# --------------------------------------------------------------------------
# MAIN
# --------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Update prices and rebuild Tableau exports.")
    parser.add_argument("--data-dir", default=DATA_DIR, help="folder holding the CSVs")
    parser.add_argument("--weeks", type=int, default=1, help="how many new weeks to add")
    parser.add_argument("--seed", type=int, default=None, help="random seed (reproducible runs)")
    parser.add_argument("--dry-run", action="store_true", help="print, write nothing")
    parser.add_argument("--rebuild-only", action="store_true",
                        help="add no weeks; just regenerate exports from existing prices")
    args = parser.parse_args()

    rng = random.Random(args.seed)

    ingredients, recipes, recipe_ingredients, price_history = load_data(args.data_dir)
    prices = build_price_lookup(price_history)

    weeks = sorted({int(r["Week_Number"]) for r in price_history})
    last_week = max(weeks)

    print(f"Loaded {len(ingredients)} ingredients, {len(recipes)} recipes, "
          f"{len(price_history)} price rows through week {last_week}.")

    # --- capture the "before" picture so we can report what changed --------
    before = {}
    for recipe in recipes:
        cost = batch_cost(recipe["Recipe_ID"], recipe_ingredients, prices, last_week)
        before[recipe["Recipe_ID"]] = margin_pct(recipe, cost)

    new_rows = []
    all_shocks = []

    if not args.rebuild_only:
        for step in range(args.weeks):
            new_week = last_week + 1 + step
            week_date = next_week_date(price_history, new_week)
            rows, shocks = generate_week(ingredients, prices, new_week - 1,
                                         new_week, week_date, rng)
            new_rows.extend(rows)
            all_shocks.extend(shocks)
            weeks.append(new_week)
            print(f"Generated week {new_week} ({week_date}): {len(rows)} prices.")

    if args.dry_run:
        print("\n--- DRY RUN: nothing written ---")
        for row in new_rows[:5]:
            print("  ", row)
        if len(new_rows) > 5:
            print(f"   ... and {len(new_rows) - 5} more rows")
        return

    # --- append the new prices to the history file ------------------------
    if new_rows:
        path = os.path.join(args.data_dir, PRICE_HISTORY_FILE)
        with open(path, "a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=[
                "Ingredient_ID", "Ingredient_Name", "Week_Number",
                "Week_Date", "Cost_Per_Unit", "Note"])
            writer.writerows(new_rows)
        print(f"Appended {len(new_rows)} rows to {PRICE_HISTORY_FILE}.")

    # --- rebuild everything downstream ------------------------------------
    written, at_risk, spikes = rebuild_exports(
        args.data_dir, ingredients, recipes, recipe_ingredients, prices, sorted(weeks))

    print("\nRebuilt exports:")
    for name, count in written:
        print(f"   {name:<32} {count} rows")

    # --- the compliance-style summary -------------------------------------
    latest = max(weeks)
    print("\n" + "=" * 62)
    print(f"  RISK SUMMARY — week {latest}")
    print("=" * 62)

    if all_shocks:
        print("\n  Supply shocks generated this run:")
        for name, change in all_shocks:
            print(f"    {name:<22} {change:+.1%}")

    recent_spikes = [s for s in spikes if s["Week_Number"] > last_week]
    if recent_spikes:
        print(f"\n  Price alerts (> +{SPIKE_THRESHOLD:.0%} vs. prior week):")
        id_to_name = {i["Ingredient_ID"]: i["Ingredient_Name"] for i in ingredients}
        for s in recent_spikes:
            print(f"    week {s['Week_Number']}  {id_to_name[s['Ingredient_ID']]:<22} "
                  f"{s['Price_Change']:+.1%}")
    else:
        print(f"\n  No ingredient rose more than {SPIKE_THRESHOLD:.0%} in the new week(s).")

    print("\n  Recipes AT RISK (margin below persona threshold):")
    if at_risk:
        for row in sorted(at_risk, key=lambda r: r["Margin_Pct"]):
            gap = THRESHOLDS.get(row["Persona_Type"], DEFAULT_THRESHOLD) - row["Margin_Pct"]
            print(f"    {row['Recipe_Name']:<26} {row['Persona_Type']:<8} "
                  f"{row['Margin_Pct']:6.1%}  ({gap:.1%} below threshold)")
    else:
        print("    None.")

    # Did anything cross the line *this run*? That's the real alert.
    crossings = []
    for recipe in recipes:
        cost = batch_cost(recipe["Recipe_ID"], recipe_ingredients, prices, latest)
        now = margin_pct(recipe, cost)
        was = before.get(recipe["Recipe_ID"], now)
        limit = threshold_for(recipe)
        if was >= limit > now:
            crossings.append((recipe["Recipe_Name"], was, now))

    if crossings:
        print("\n  *** NEWLY BREACHED THIS RUN ***")
        for name, was, now in crossings:
            print(f"    {name}: {was:.1%} -> {now:.1%}")

    print("\nDone. Refresh your Tableau extracts to pick up the new files.")


if __name__ == "__main__":
    main()
