#!/usr/bin/env python3
"""
fx_demo.py — a lesson in how APIs work, with no signup required.

WHY THIS EXISTS
---------------
This is the no-key alternative to bls_demo.py. It calls the Frankfurter API,
which serves European Central Bank exchange rates. There is no registration,
no key, and no rate limit — so a government website being down, or an email
that never arrives, can never block you.

WHY EXCHANGE RATES, IN A RECIPE PROJECT
---------------------------------------
Four ingredients in this project are imported commodities:

    Cocoa Powder      cocoa is traded on the London and New York exchanges
    Chocolate Chips   same underlying cocoa
    Vanilla Extract   overwhelmingly imported, mostly from Madagascar
    Espresso Beans    coffee is a globally traded commodity

Those are all priced in a foreign currency, or on a global market, before they
ever reach a U.S. vendor. So when the dollar weakens, their cost rises — and
nothing in this dashboard would show you why.

That is a genuine blind spot in the product, and this script is how you'd start
measuring it. Note the honest limitation: an exchange rate move does not pass
through to a shelf price one-for-one, or immediately. This estimates exposure;
it does not predict costs.

SETUP
-----
    pip3 install requests

USAGE
-----
    python3 fx_demo.py
    python3 fx_demo.py --raw          # see the actual JSON (do this once!)
    python3 fx_demo.py --days 365     # look back further
"""

import argparse
import json
import sys
from datetime import date, timedelta

try:
    import requests
except ImportError:
    sys.exit("This script needs the 'requests' library. Run:  pip3 install requests")


# --------------------------------------------------------------------------
# PART 1 — THE ENDPOINT
# Unlike the BLS API, this one takes its question in the URL itself, as a GET
# request. That's the simpler and more common style: you can paste the URL
# straight into a browser and see the JSON.
# --------------------------------------------------------------------------

BASE_URL = "https://api.frankfurter.app"

# Which currencies matter for imported food ingredients.
CURRENCIES = {
    "EUR": "Euro — European specialty imports, cocoa processing",
    "GBP": "British pound — London is a major cocoa trading hub",
    "CHF": "Swiss franc — chocolate manufacturing",
}

# Which of this project's ingredients carry currency exposure.
EXPOSED_INGREDIENTS = [
    ("ING007", "Cocoa Powder"),
    ("ING006", "Chocolate Chips"),
    ("ING005", "Vanilla Extract"),
    ("ING015", "Espresso Beans"),
]


def get_json(url):
    """
    PART 2 — MAKING THE REQUEST
    A GET request asks for something. requests.get() fetches it, and .json()
    turns the text that comes back into Python dictionaries and lists.
    """
    print(f"Requesting: {url}")
    response = requests.get(url, timeout=30)
    response.raise_for_status()   # stop here if the server returned an error
    return response.json()


def latest_rates():
    """Today's rate for one dollar, in each currency we care about."""
    quotes = ",".join(CURRENCIES.keys())
    return get_json(f"{BASE_URL}/latest?from=USD&to={quotes}")


def rate_history(days):
    """
    A range of dates uses '..' between them:
        /2026-01-01..2026-08-01?from=USD&to=EUR
    """
    end = date.today()
    start = end - timedelta(days=days)
    quotes = ",".join(CURRENCIES.keys())
    return get_json(f"{BASE_URL}/{start.isoformat()}..{end.isoformat()}?from=USD&to={quotes}")


def show_latest(data):
    """
    PART 3 — PARSING
    The response looks roughly like:
        {"amount": 1, "base": "USD", "date": "2026-08-07",
         "rates": {"EUR": 0.91, "GBP": 0.78, "CHF": 0.86}}
    So data["rates"]["EUR"] is the number we want.
    """
    print(f"\nRates for 1 USD, as published {data.get('date', 'unknown')}")
    print("-" * 58)
    for code, note in CURRENCIES.items():
        rate = data.get("rates", {}).get(code)
        if rate is None:
            print(f"  {code}: not returned")
            continue
        print(f"  1 USD = {rate:.4f} {code}")
        print(f"     {note}")


def show_trend(data, days):
    """
    The time-series response nests one level deeper — rates by date:
        {"rates": {"2026-01-02": {"EUR": 0.90}, "2026-01-03": {...}}}
    """
    rates_by_date = data.get("rates", {})
    if not rates_by_date:
        print("\nNo historical data returned.")
        return

    dates = sorted(rates_by_date.keys())
    first_date, last_date = dates[0], dates[-1]

    print(f"\nMovement over the last {days} days ({first_date} to {last_date})")
    print("-" * 58)

    for code in CURRENCIES:
        first = rates_by_date[first_date].get(code)
        last = rates_by_date[last_date].get(code)
        if first is None or last is None:
            continue

        # A rate is "how many EUR per USD". If that number FALLS, the dollar
        # bought less at the end than at the start — a weaker dollar, and
        # imported goods get more expensive for a U.S. buyer.
        rate_change = (last - first) / first
        dollar_direction = "weaker" if rate_change < 0 else "stronger"

        # What a U.S. buyer pays, in dollars, moves the opposite way.
        cost_impact = (first / last) - 1

        print(f"  USD/{code}:  {first:.4f} -> {last:.4f}   ({rate_change:+.2%}, dollar {dollar_direction})")
        print(f"     estimated effect on the dollar cost of goods priced in {code}: {cost_impact:+.2%}")

    # Tie it back to the actual project.
    eur_first = rates_by_date[first_date].get("EUR")
    eur_last = rates_by_date[last_date].get("EUR")
    if eur_first and eur_last:
        impact = (eur_first / eur_last) - 1
        print("\n" + "=" * 58)
        print("  CURRENCY EXPOSURE — ingredients not covered by this model")
        print("=" * 58)
        for ing_id, name in EXPOSED_INGREDIENTS:
            print(f"    {ing_id}  {name:<20} approx. {impact:+.1%} from FX alone")
        print("\n  This is an ESTIMATE of exposure, not a cost forecast. Exchange")
        print("  rate moves pass through to shelf prices partially and with a lag.")
        print("  The point is that this project's Price_History has no way to")
        print("  represent this risk at all — which makes it a v2 candidate.")


def main():
    parser = argparse.ArgumentParser(description="Fetch real exchange rates. No API key needed.")
    parser.add_argument("--days", type=int, default=180, help="how many days of history")
    parser.add_argument("--raw", action="store_true", help="print the raw JSON instead")
    args = parser.parse_args()

    try:
        latest = latest_rates()
        history = rate_history(args.days)
    except requests.exceptions.RequestException as e:
        sys.exit(f"Could not reach the API: {e}")

    if args.raw:
        print("\n--- LATEST (raw JSON) ---")
        print(json.dumps(latest, indent=2))
        print("\n--- HISTORY (raw JSON, first 1500 characters) ---")
        print(json.dumps(history, indent=2)[:1500])
        return

    show_latest(latest)
    show_trend(history, args.days)

    print("\nSource: European Central Bank reference rates, via the Frankfurter API.")
    print("Note: the ECB publishes once per business day, so weekend and holiday")
    print("requests return the most recent business day's rate. Check the 'date'")
    print("field in the response rather than assuming it matches what you asked for.")


if __name__ == "__main__":
    main()
