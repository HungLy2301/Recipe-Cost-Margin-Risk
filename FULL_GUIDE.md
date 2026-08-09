# Weeks 9 & 10 — Complete Step-by-Step Manual

Written for someone who has never used Terminal or Python. Every command is
explained before you run it. Nothing is skipped.

**Total time: about 4–5 hours.** There are seven parts. Each one ends with the
project in a working, finished state, so you can stop between parts and pick up
later without anything being half-broken.

| Part | What you'll do | Time |
|---|---|---|
| 0 | Check what's already on your Mac | 15 min |
| 1 | Build the repository and publish it | 30 min |
| 2 | Run the Python automation | 45 min |
| 3 | Call a real government API | 30 min |
| 4 | Refresh Tableau against the new data | 30 min |
| 5 | Deploy the React app to a live URL | 90 min |
| 6 | Finish the README | 40 min |

---

# Part 0 — Groundwork

## 0.1 What Terminal is

Terminal is a way to talk to your Mac by typing instead of clicking. When you
double-click a folder in Finder, you're doing the same thing as typing a command
to open it — just with a mouse. Neither is more "advanced"; typing is simply more
precise, which matters when you want exact, repeatable results.

**Open it:** press `Cmd + Space`, type `terminal`, press Enter.

You'll see a line ending in `%`. That's the **prompt** — it means "I'm ready."
You type a command, press Enter, it runs, and the prompt comes back.

Three commands are all you need:

| Command | Means | Example |
|---|---|---|
| `cd` | "change directory" — move into a folder | `cd Documents` |
| `ls` | "list" — show what's in this folder | `ls` |
| `pwd` | "print working directory" — where am I? | `pwd` |

**Useful to know:** `~` is shorthand for your home folder. And if you type the
first few letters of a folder name and press **Tab**, Terminal finishes it for you.
Use that constantly — it prevents typos.

**If a command fails, read the last line of the error.** It almost always says
exactly what's wrong. Bring it to me verbatim rather than paraphrasing.

## 0.2 Check what you already have

Run these one at a time. You're just looking to see whether each one answers.

```bash
python3 --version
```
Expect something like `Python 3.9.6`. Any 3.x is fine. macOS includes Python.

```bash
git --version
```
Expect `git version 2.x`. If it instead offers to install developer tools, click
**Install** and wait — that's normal and takes a few minutes.

```bash
node --version
```
**This one may fail**, and that's expected — Node doesn't ship with macOS. You need
it only for Part 5 (deployment). If you get "command not found", go to
**https://nodejs.org**, download the **LTS** version, run the installer, then quit
and reopen Terminal and check again. You want v18 or higher.

## 0.3 Get your BLS API key

Go to **https://data.bls.gov/registrationEngine/**, enter your email, and submit.
The key arrives by email — a long string of letters and numbers. Do this **now**,
before Part 1, so it's waiting for you by the time you reach Part 3.

## 0.4 Gather your files

Put these on your Desktop where you can find them:

- Your Week 2 Excel file
- Your Week 3–4 `.db` SQLite file
- `RCMR_DashBoard.twb`
- All 8 CSVs
- `RCMRConsole.jsx`
- The files I gave you: `update_prices.py`, `bls_demo.py`, `README.md`,
  `.gitignore`, `storage.js`, `vite.config.js`, `main.jsx`, `index.html`,
  `deploy.yml`

**One warning about `.gitignore`:** files starting with a dot are hidden in Finder.
Press `Cmd + Shift + .` (period) to toggle hidden files visible. Press it again
to hide them.

---

# Part 1 — Build and publish the repository

## 1.1 What a repository is

A repository ("repo") is a folder that keeps a history of itself. Every time you
save a checkpoint — a **commit** — it records what changed. GitHub stores a copy
online so others can see it. For you, it's a portfolio piece with a public URL.

## 1.2 Create the folder structure

```bash
mkdir -p ~/Documents/recipe-cost-margin-risk/{data,excel,sql,tableau,app/src,automation,.github/workflows}
cd ~/Documents/recipe-cost-margin-risk
ls
```

`mkdir -p` makes folders, including any parent folders that don't exist yet. The
curly braces create several at once. You should see: `app data excel sql tableau
automation` (the `.github` one is hidden).

## 1.3 Put the files in place

Open the folder in Finder:

```bash
open .
```

The `.` means "this folder." Now drag files in:

| Folder | Files |
|---|---|
| `data/` | all 8 CSVs |
| `excel/` | your Week 2 `.xlsx` |
| `sql/` | your `.db` file |
| `tableau/` | `RCMR_DashBoard.twb` |
| `app/src/` | `RCMRConsole.jsx`, `main.jsx`, `storage.js` |
| `app/` | `index.html`, `vite.config.js` |
| `automation/` | `update_prices.py`, `bls_demo.py` |
| `.github/workflows/` | `deploy.yml` |
| root (top level) | `README.md`, `.gitignore` |

To reach the hidden `.github` folder in Finder, press `Cmd + Shift + G` and type
`~/Documents/recipe-cost-margin-risk/.github/workflows`.

Verify from Terminal:

```bash
ls -R
```

`-R` means "recursive" — show everything inside everything.

## 1.4 Why `.gitignore` matters

`.gitignore` is a list of things Git should **never** upload. Two reasons:

1. **Secrets.** Your BLS API key must never end up on a public GitHub page. Once
   pushed, it's public forever — even if you delete it, it stays in the history.
2. **Junk.** macOS scatters `.DS_Store` files everywhere; Python creates cache
   folders. Nobody wants those in your portfolio.

## 1.5 Publish with GitHub Desktop

1. Open GitHub Desktop.
2. **File → Add Local Repository**.
3. Choose `~/Documents/recipe-cost-margin-risk`.
4. It says this isn't a Git repository yet and offers to **create** one. Do that.
5. You'll now see every file listed on the left as a pending change.
6. Bottom left, in the **Summary** box, type: `Initial commit — weeks 1-10`
7. Click **Commit to main**.
8. Top of the window, click **Publish repository**.
9. **Uncheck "Keep this code private."** A private portfolio repo can't be shown
   to anyone. This is the single most common mistake here.
10. Click **Publish repository**.

Your repo is now live at `https://github.com/YOUR-USERNAME/recipe-cost-margin-risk`.

**✅ Checkpoint:** Week 10's core deliverable — "push to GitHub" — is now met. If
you stopped right here, you'd have a complete project.

---

# Part 2 — Run the Python automation

## 2.1 What this script does, in plain terms

Your project has one source of truth: the weekly price file. Everything else —
margins, spike alerts, the risk scatter — is *calculated* from it. Until now you
calculated those by hand in SQL and exported them manually.

That's how your data drifted: the prices got updated, the exports didn't, and
nothing complained. `update_prices.py` makes it one command. Add a week, and every
downstream file is rebuilt from source. The dashboard *cannot* disagree with the
database anymore.

## 2.2 Work on copies first

```bash
cd ~/Documents/recipe-cost-margin-risk/automation
cp ../data/*.csv .
ls
```

`cp` copies. `../` means "the folder above this one," so `../data/*.csv` means
"every CSV in the data folder next door." The `.` at the end means "into here."

You're working on copies so a mistake costs nothing.

## 2.3 First run — a dry run

```bash
python3 update_prices.py --dry-run
```

`python3` is the program. `update_prices.py` is the file to run. `--dry-run` is a
**flag** — an option that changes behavior. This one means "show me what you'd do,
but don't actually change any files." Always start here with an unfamiliar script.

You should see it load 21 ingredients, 10 recipes, and 252 price rows, then print a
sample of the week-13 prices it would generate.

## 2.4 Rebuild the stale exports

```bash
python3 update_prices.py --rebuild-only
```

This adds no new prices — it just recalculates all six export files from the
existing 12 weeks. **This is the fix for the drift I found.**

**What to look for:** the risk summary should report **Lemon Bars at 11.7%, AT
RISK**. That number matters more than it looks. Your Excel model, your SQL views,
your Tableau dashboard, your React app, and now this Python script all independently
compute the same recipe as at-risk. Five implementations, one answer. That's what
makes the project trustworthy rather than just complete.

Compare what changed:

```bash
head -5 Price_Most_Change.csv
head -5 ../data/Price_Most_Change.csv
```

The old file lists spikes for four ingredients including a 922% blueberry jump.
The new one reflects your actual current data. That contrast is your README story.

## 2.5 Add a real week

```bash
python3 update_prices.py --seed 42
```

`--seed 42` controls the randomness. Computers generate "random" numbers from a
starting value; give the same seed and you get identical results every time. That
makes your run **reproducible** — anyone can rerun it and see exactly what you saw.
Change it to `--seed 7` for a different but equally repeatable outcome.

Read the risk summary. It prints supply shocks, price alerts above +10%, every
at-risk recipe, and — most importantly — anything that *newly crossed* its
threshold on this run. That last section is the compliance-alert pattern your
whole project is about.

## 2.6 Explore

```bash
python3 update_prices.py --weeks 4 --seed 7
python3 update_prices.py --weeks 12 --seed 99
```

Watch a month, then a quarter, unfold. Look for a run where a Daniel or Albert
recipe breaches — those sit at 85–94% margin, so it takes a serious shock, and
seeing one happen is worth a screenshot for your README.

**If you want to start over:** delete the CSVs in `automation/` and re-copy them
from `data/` with the command from step 2.2.

## 2.7 Read the code

You've now run it several times. Open `update_prices.py` in VS Code and read it
top to bottom. You will genuinely understand most of it, because you've watched
what each part produces. Look especially at:

- The `CATEGORY_VOLATILITY` block near the top — that's the business rule for how
  much each ingredient category swings. Change a number and rerun to see the effect.
- `batch_cost()` and `margin_pct()` — these are your Excel formulas and SQL views,
  written a third way. Compare them to what you wrote in Weeks 2 and 3.

Being able to say "I understand every line" is worth more than having more lines.

## 2.8 Promote the results

Once you're happy with a run, copy the regenerated files back:

```bash
cp *.csv ../data/
```

Then in GitHub Desktop: type a summary like `Week 9 — automate price updates and
rebuild exports`, **Commit to main**, then **Push origin**.

**✅ Checkpoint:** Week 9 is complete.

---

# Part 3 — Call a real API

## 3.1 The concept, once more

Your browser asks a website for a page and gets back HTML — designed for human
eyes. Your script asks an **API** for data and gets back **JSON** — designed for
programs. Same servers, different packaging.

`bls_demo.py` asks the U.S. Bureau of Labor Statistics for real national grocery
prices. It's deliberately standalone: nothing in your project depends on it, so it
cannot break anything.

## 3.2 Install the one library it needs

```bash
pip3 install requests
```

`pip3` installs Python libraries — pre-written code other people have shared.
`requests` is the standard way Python talks to the internet.

**If that fails** with a message about an "externally managed environment," use:

```bash
pip3 install requests --break-system-packages
```

That sounds alarming but is safe here — it just means "install alongside the
system Python."

## 3.3 Give it your key without putting it in a file

```bash
export BLS_API_KEY="paste-your-key-here"
```

`export` puts a value into Terminal's memory for the current window. The script
reads it from there. **This is the whole point:** the key never appears in any file,
so it can never be accidentally pushed to GitHub.

The tradeoff: it's forgotten when you close Terminal. Rerun the `export` line each
new session.

## 3.4 Run it

```bash
python3 bls_demo.py
```

You should get real prices for flour, eggs, butter, and chicken breast — the last
six months of each, plus the change over the period.

Try:

```bash
python3 bls_demo.py --years 5
python3 bls_demo.py --raw
```

`--raw` prints the actual JSON. **Do this one.** Seeing the nested structure — and
then looking at how `show()` in the script digs through it — is the moment APIs
click. You'll see `Results` containing `series`, each with a `data` list, each
entry having `year`, `period`, and `value`.

## 3.5 If it fails

I could not test this against the live API — my sandbox blocks that domain — so
this is the most likely thing to need a fix.

| Message | Meaning |
|---|---|
| `Network problem reaching BLS` | No internet, or the endpoint moved |
| `BLS rejected the request` | Usually a bad key or too many requests today |
| `no data returned` for one series | That series ID is wrong or retired |
| `command not found: python3` | You're not in Terminal, or Python is missing |

Bring me the exact message and we'll fix it. **This step is optional** — Week 9 is
already complete without it.

## 3.6 A thing worth noticing

Try changing one series ID in the file to `APU0000706211` (chicken breast, bone-in)
and rerun. It returns **successfully** — with data that stops in 2011. The API said
"success." The data was thirteen years stale.

That's the same failure mode as your drifted Tableau exports, and it's why "did the
request succeed?" and "is this data correct?" are two different questions. Worth
remembering in any monitoring context.

**✅ Checkpoint:** you've integrated a real external API.

---

# Part 4 — Refresh Tableau

Your regenerated CSVs now hold different numbers than the ones Tableau read months
ago. Time to reconcile.

1. Open `RCMR_DashBoard.twb`.
2. Go to the **Data Source** tab (bottom left).
3. For each data source in the left panel, right-click → **Refresh**.
4. If it can't find a file, it'll ask you to locate it — point it at the version in
   `~/Documents/recipe-cost-margin-risk/data/`.
5. Visit each of your five sheets and confirm they still render.

**Expect the Price Heatmap and Risk Scatter to change noticeably.** The old spike
data was wrong. The heatmap should now look calmer and more realistic, and the
scatter's points will move. That's the correction, not a bug.

**If a sheet breaks entirely**, it's usually a renamed column. Check the field
names in the Data pane against the CSV headers.

Then: **Server → Tableau Public → Save to Tableau Public**, and copy the resulting
URL — you need it for the README.

**✅ Checkpoint:** your BI layer and source data agree for the first time.

---

# Part 5 — Deploy the React app

This is the longest part. Take a break first.

## 5.1 Why an extra step is needed

`RCMRConsole.jsx` isn't something a browser can open. It's written in JSX — React's
convenient syntax — which browsers don't understand, and it references libraries
(`recharts`, `papaparse`, `xlsx`) that must be fetched and bundled in.

**Vite** is the tool that does the translating. You run one command; it produces a
`dist` folder of ordinary HTML, CSS, and JavaScript that any browser can open.

## 5.2 Create the project

```bash
cd ~/Documents/recipe-cost-margin-risk/app
npm init -y
npm install react react-dom recharts papaparse xlsx
npm install --save-dev vite @vitejs/plugin-react
```

- `npm` is Node's package installer — Python's `pip3`, for JavaScript.
- `npm init -y` creates `package.json`, the list of what your project needs.
- The first install adds libraries your app uses when running.
- `--save-dev` adds tools needed only to *build* the app, not to run it.

This takes a few minutes and prints a lot. Warnings are normal; only stop for
`ERR!`.

## 5.3 Add the run commands

Open `app/package.json` in VS Code. Find the `"scripts"` section and replace it
with:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
},
```

Watch the commas — JSON breaks on a missing or extra one. VS Code will underline
the problem in red if you get it wrong.

## 5.4 Fix the storage problem

Your app saves data through `window.storage`, which exists only inside Claude. On a
real website it's missing, so all eleven save/load calls would silently do nothing
and your data would disappear on every refresh — meaning US-6's acceptance criteria
would pass in Claude and fail on your live site.

`storage.js` (already in `app/src/`) solves it: it offers the same three commands
and quietly uses whichever locker is available.

**Wire it in — two edits:**

**Edit 1.** Open `app/src/RCMRConsole.jsx`. At the top, after line 3
(`import * as XLSX from "xlsx";`), add:

```javascript
import storage from "./storage.js";
```

**Edit 2.** Replace every `window.storage` with `storage`:

1. Press `Cmd + Option + F` (Find and Replace).
2. Find: `window.storage`
3. Replace: `storage`
4. Click **Replace All**.

It should report **11 replacements**. Verify with `Cmd + F` for `window.storage` —
you want **0 results**.

## 5.5 Set the base path

Open `app/vite.config.js`. It contains:

```javascript
base: "/recipe-cost-margin-risk/",
```

This must exactly match your repo name, slashes on both sides. If you named your
repo something else, change it now.

**Why this exists:** your site won't be at `username.github.io` — it'll be at
`username.github.io/recipe-cost-margin-risk/`, a subfolder. Without this line the
app looks for its files at the root, finds nothing, and shows a blank white page.
This is the #1 cause of failed first deployments.

## 5.6 Test locally

```bash
npm run dev
```

It prints a local address like `http://localhost:5173/recipe-cost-margin-risk/`.
Hold `Cmd` and click it, or paste it into your browser.

**Your app should appear.** Test properly:

- Click through all six tabs
- Add a recipe, refresh the page — **is it still there?** That's the storage shim
  working
- Drag a price-shock slider and confirm margins move
- Check the Insights charts render
- **The Tableau embed should now work**, since you're on a real web server rather
  than Claude's sandbox

Stop the server with `Ctrl + C` (not `Cmd`).

### If the page is blank

Right-click → **Inspect** → **Console** tab. Red errors there tell you what's wrong.

| Error mentions | Likely cause |
|---|---|
| `Failed to resolve import` | A library didn't install — rerun `npm install` |
| `storage is not defined` | Edit 1 in 5.4 was missed |
| `Unexpected token` | A typo in `package.json` — check commas |
| Nothing at all | `index.html` isn't in `app/`, or `main.jsx` isn't in `app/src/` |

Screenshot the console and send it to me.

## 5.7 Build

```bash
npm run build
```

Creates `app/dist/`. That folder is your entire website. Confirm with `ls dist`.

## 5.8 Turn on GitHub Pages

`deploy.yml` is already in place — it tells GitHub to rebuild and republish
automatically every time you push. You just need to enable Pages:

1. Go to your repo on github.com.
2. **Settings** (top row) → **Pages** (left sidebar).
3. Under **Source**, choose **GitHub Actions** (not "Deploy from a branch").
4. That's it — nothing to save.

## 5.9 Deploy

In GitHub Desktop: summary `Week 10 — deploy React console`, **Commit to main**,
**Push origin**.

Then on github.com, click the **Actions** tab. You'll see your workflow running —
a yellow dot means in progress, green check means done, red X means failed. It
takes 1–3 minutes.

When it's green, your app is live at:

```
https://YOUR-USERNAME.github.io/recipe-cost-margin-risk/
```

Open it on your phone too.

### If Actions shows a red X

Click the failed run, then the failed step, to see the log. Common causes:

- **`npm ci` failed** — `package-lock.json` wasn't committed. Check GitHub Desktop
  for uncommitted changes in `app/`.
- **`vite: not found`** — the dev dependencies didn't get committed; confirm
  `package.json` has the `devDependencies` section.
- **Green check but blank page** — almost always `base` in `vite.config.js` not
  matching the repo name.

Send me the log text and I'll pinpoint it.

**✅ Checkpoint:** you have a live, public, working web app.

---

# Part 6 — Finish the README

The README is what people actually read. Everything else is evidence.

## 6.1 Fill the three TODOs

Open `README.md` in VS Code and search for `TODO`:

1. **Your Tableau link** from Part 4
2. **Your live app link** from Part 5
3. **A screenshot**

## 6.2 Screenshots

Press `Cmd + Shift + 4`, drag a box, and it saves to your Desktop. Take three:

- The **Overview** tab showing the ranked recipe list with an at-risk flag
- The **Price Shocks** tab mid-slide, showing the ripple
- Your **Terminal** showing the `update_prices.py` risk summary — this one proves
  the automation is real

Easiest way to add them: on github.com, open `README.md`, click the **pencil** icon,
and drag the image straight into the text box. GitHub uploads it and writes the
markdown link for you. Click **Commit changes** when done.

## 6.3 Make it yours

Read the whole thing out loud. I drafted it; the voice should be yours. Cut
anything that doesn't sound like you.

Pay particular attention to **"Two things I got wrong."** That section is the most
valuable part of the document, because it shows judgment rather than output. Make
sure you can tell both stories out loud in about ninety seconds each:

- **The drift story.** Your exports and your source data disagreed. Nothing errored.
  A 922% blueberry spike sat on your dashboard looking perfectly plausible. You
  found it by recomputing from source and comparing — and the fix was to make
  regeneration automatic so it can't recur.
- **The API story.** You could have wired real government price data into the
  project. You chose not to, because the units, frequency, coverage, and price basis
  all disagreed with your model, and forcing them together would have destroyed the
  test case validating every stage since Week 2. So the integration lives as a
  demonstration instead. Deciding *not* to ship something for a defensible reason is
  a product skill.

## 6.4 Final commit

GitHub Desktop → summary `Week 10 — README, screenshots, links` → **Commit to
main** → **Push origin**.

---

# Final checklist

- [ ] Public repo with all ten weeks of artifacts
- [ ] `update_prices.py` runs and regenerates all six exports
- [ ] Lemon Bars reads 11.7% AT RISK — consistent across all five implementations
- [ ] `bls_demo.py` returns real BLS data *(optional)*
- [ ] Tableau refreshed and republished
- [ ] React app live at a public URL, with data persisting across refresh
- [ ] README with links, screenshots, and both failure stories

---

# What to bring me if you get stuck

1. **Which step number** you're on
2. **The exact command** you ran
3. **The full error text**, copied not retyped
4. A screenshot of the browser console for anything visual

Errors are the normal state of this work, not a sign you did something wrong. The
whole skill is reading them calmly and narrowing down the cause.
