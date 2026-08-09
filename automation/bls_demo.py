#!/usr/bin/env python3
"""
bls_demo.py — a standalone lesson in how APIs work.

This script asks the U.S. Bureau of Labor Statistics for real national average
grocery prices and prints them. It is DELIBERATELY SEPARATE from the project's
data pipeline: nothing in the dashboard depends on it, so if the government
changes something, your project still runs.

Why separate? Because BLS prices are national averages published monthly, while
this project tracks one buyer's actual vendor prices weekly. Overwriting the
project's prices with BLS numbers would break the recipe cost baseline that has
been consistent since Week 2. So this script demonstrates the API skill without
contaminating the data. See the README's "Why the BLS data isn't wired in".

SETUP
-----
    pip install requests

    Optional but recommended — get a free API key (takes 2 minutes):
    https://data.bls.gov/registrationEngine/

    Then, in Terminal:
        export BLS_API_KEY="your-key-here"

    Without a key the script still works, using the API's version 1 endpoint,
    which allows fewer requests per day.

USAGE
-----
    python3 bls_demo.py
    python3 bls_demo.py --years 3
"""

import argparse
import json
import os
import sys

try:
    import requests
except ImportError:
    sys.exit("This script needs the 'requests' library. Run:  pip install requests")


# --------------------------------------------------------------------------
# PART 1 — THE ENDPOINT
# An API endpoint is just a URL you send questions to. Unlike a normal web
# page, it answers in JSON (structured text for programs) rather than HTML.
# --------------------------------------------------------------------------

V2_ENDPOINT = "https://api.bls.gov/publicAPI/v2/timeseries/data/"
V1_ENDPOINT = "https://api.bls.gov/publicAPI/v1/timeseries/data/"


# --------------------------------------------------------------------------
# PART 2 — WHAT TO ASK FOR
# BLS identifies every dataset by a "series ID". You can't browse; you have to
# know the code. These are Average Price (AP) series for U.S. city average.
# The four below were chosen because they map to ingredients in this project.
# --------------------------------------------------------------------------

SERIES = {
    "APU0000701111": "Flour, white, all purpose (per lb)",
    "APU0000708111": "Eggs, grade A, large (per dozen)",
    "APU0000FS1101": "Butter, stick (per lb)",
    "APU0000FF1101": "Chicken breast, boneless (per lb)",
}

# A caution worth knowing: APU0000706211 (chicken breast, bone-in) still
# responds successfully but was discontinued in 2011. An API returning
# "success" does not mean the data is current. Always check the dates.

MONTHS = {
    "M01": "Jan", "M02": "Feb", "M03": "Mar", "M04": "Apr",
    "M05": "May", "M06": "Jun", "M07": "Jul", "M08": "Aug",
    "M09": "Sep", "M10": "Oct", "M11": "Nov", "M12": "Dec",
}


def fetch(series_ids, start_year, end_year, api_key=None):
    """
    PART 3 — MAKING THE REQUEST

    We send a POST request: our question travels in the body of the message as
    JSON, rather than tacked onto the end of the URL. The API reads it and
    sends JSON back.
    """
    payload = {
        "seriesid": series_ids,
        "startyear": str(start_year),
        "endyear": str(end_year),
    }

    if api_key:
        payload["registrationkey"] = api_key
        url = V2_ENDPOINT
    else:
        url = V1_ENDPOINT

    print(f"Requesting {len(series_ids)} series from {url}")
    print(f"Years {start_year}-{end_year}, API key: {'yes' if api_key else 'no (v1 limits apply)'}\n")

    # timeout matters: without it, a hung server hangs your script forever.
    response = requests.post(url, json=payload, timeout=30)

    # PART 4 — CHECKING THE ANSWER
    # Two separate things can go wrong, and beginners often check only the first:
    #   (a) the network/HTTP layer failed  -> response.status_code is not 200
    #   (b) HTTP succeeded but BLS rejected the question -> status field says so
    response.raise_for_status()

    data = response.json()

    if data.get("status") != "REQUEST_SUCCEEDED":
        messages = data.get("message", ["no message returned"])
        raise RuntimeError("BLS rejected the request: " + "; ".join(messages))

    return data


def show(data):
    """
    PART 5 — PARSING
    The JSON arrives nested several layers deep. Reading it is a matter of
    following the structure:  Results -> series -> [each series] -> data -> [each month]
    """
    for series in data["Results"]["series"]:
        series_id = series["seriesID"]
        label = SERIES.get(series_id, series_id)

        points = series.get("data", [])
        if not points:
            print(f"{label}: no data returned\n")
            continue

        # BLS returns newest first. Reverse for chronological reading.
        points = list(reversed(points))
        recent = points[-6:]

        print(f"{label}")
        print("-" * len(label))
        for point in recent:
            month = MONTHS.get(point["period"], point["period"])
            print(f"   {month} {point['year']}   ${float(point['value']):.3f}")

        # A small analysis: how much did it move across the window we pulled?
        first_value = float(points[0]["value"])
        last_value = float(points[-1]["value"])
        if first_value:
            change = (last_value - first_value) / first_value
            print(f"   change over period: {change:+.1%}")
        print()


def main():
    parser = argparse.ArgumentParser(description="Fetch real grocery prices from the BLS API.")
    parser.add_argument("--years", type=int, default=2, help="how many years back to pull")
    parser.add_argument("--raw", action="store_true", help="dump the raw JSON instead")
    args = parser.parse_args()

    api_key = os.environ.get("BLS_API_KEY")  # never hard-code secrets in a file you push

    from datetime import date
    end_year = date.today().year
    start_year = end_year - args.years + 1

    try:
        data = fetch(list(SERIES.keys()), start_year, end_year, api_key)
    except requests.exceptions.RequestException as e:
        sys.exit(f"Network problem reaching BLS: {e}")
    except RuntimeError as e:
        sys.exit(str(e))

    if args.raw:
        print(json.dumps(data, indent=2)[:3000])
        return

    show(data)

    print("Source: U.S. Bureau of Labor Statistics, Average Price Data (AP).")
    print("Note: BLS advises that average prices measure the price level in a")
    print("given month, not price change over time — CPI index series are the")
    print("appropriate choice for measuring change.")


if __name__ == "__main__":
    main()
