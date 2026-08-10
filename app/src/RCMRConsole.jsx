import React, { useState, useEffect, useMemo, useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import storage from "./storage.js";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  LineChart,
  Line,
} from "recharts";

/* ---------------------------------------------------------
   RCMR Console — Recipe Cost & Margin Risk Dashboard
--------------------------------------------------------- */

const TOKENS = {
  ink: "#1C2431",
  inkSoft: "#2A3444",
  parchment: "#F4EFE3",
  parchmentDim: "#EAE3D2",
  rule: "#C9BFA8",
  wine: "#7A2E33",
  wineSoft: "#F3E1E1",
  amber: "#B8752F",
  amberSoft: "#F3E7D3",
  sage: "#4C7A63",
  sageSoft: "#E4EDE7",
  gold: "#C9A227",
  textOnInk: "#F4EFE3",
  textOnParchmentMuted: "#5B5241",
};

const THRESHOLDS = { Mai: 0.20, Daniel: 0.10, Albert: 0.10 };

/* ---------- Seed data (Harry's real Week 2-4 dataset) ---------- */

const SEED_INGREDIENTS = [
  { Ingredient_ID: "ING001", Ingredient_Name: "All-Purpose Flour", Unit: "g", Cost_Per_Unit: 0.0022, Primary_Vendor: "Costco", Category: "Dry Goods" },
  { Ingredient_ID: "ING002", Ingredient_Name: "Granulated Sugar", Unit: "g", Cost_Per_Unit: 0.0018, Primary_Vendor: "Costco", Category: "Dry Goods" },
  { Ingredient_ID: "ING003", Ingredient_Name: "Unsalted Butter", Unit: "g", Cost_Per_Unit: 0.0088, Primary_Vendor: "Kroger", Category: "Dairy" },
  { Ingredient_ID: "ING004", Ingredient_Name: "Large Eggs", Unit: "ea", Cost_Per_Unit: 0.3, Primary_Vendor: "Kroger", Category: "Dairy" },
  { Ingredient_ID: "ING005", Ingredient_Name: "Chocolate Chips", Unit: "g", Cost_Per_Unit: 0.012, Primary_Vendor: "Costco", Category: "Dry Goods" },
  { Ingredient_ID: "ING006", Ingredient_Name: "Brown Sugar", Unit: "g", Cost_Per_Unit: 0.002, Primary_Vendor: "Costco", Category: "Dry Goods" },
  { Ingredient_ID: "ING007", Ingredient_Name: "Vanilla Extract", Unit: "ml", Cost_Per_Unit: 0.08, Primary_Vendor: "Kroger", Category: "Dry Goods" },
  { Ingredient_ID: "ING008", Ingredient_Name: "Baking Soda", Unit: "g", Cost_Per_Unit: 0.002, Primary_Vendor: "Kroger", Category: "Dry Goods" },
  { Ingredient_ID: "ING009", Ingredient_Name: "Salt", Unit: "g", Cost_Per_Unit: 0.001, Primary_Vendor: "Kroger", Category: "Dry Goods" },
  { Ingredient_ID: "ING010", Ingredient_Name: "Lemons", Unit: "ea", Cost_Per_Unit: 0.6, Primary_Vendor: "Kroger", Category: "Produce" },
  { Ingredient_ID: "ING011", Ingredient_Name: "Powdered Sugar", Unit: "g", Cost_Per_Unit: 0.003, Primary_Vendor: "Costco", Category: "Dry Goods" },
  { Ingredient_ID: "ING012", Ingredient_Name: "Cocoa Powder", Unit: "g", Cost_Per_Unit: 0.012, Primary_Vendor: "Costco", Category: "Dry Goods" },
  { Ingredient_ID: "ING013", Ingredient_Name: "Bananas", Unit: "ea", Cost_Per_Unit: 0.25, Primary_Vendor: "Kroger", Category: "Produce" },
  { Ingredient_ID: "ING014", Ingredient_Name: "Milk", Unit: "ml", Cost_Per_Unit: 0.0011, Primary_Vendor: "Kroger", Category: "Dairy" },
  { Ingredient_ID: "ING015", Ingredient_Name: "Espresso Beans", Unit: "g", Cost_Per_Unit: 0.025, Primary_Vendor: "Local Roaster", Category: "Dry Goods" },
  { Ingredient_ID: "ING016", Ingredient_Name: "Black Tea Bags", Unit: "ea", Cost_Per_Unit: 0.1, Primary_Vendor: "Costco", Category: "Dry Goods" },
  { Ingredient_ID: "ING017", Ingredient_Name: "Blueberries", Unit: "g", Cost_Per_Unit: 0.008, Primary_Vendor: "Kroger", Category: "Produce" },
  { Ingredient_ID: "ING018", Ingredient_Name: "Baking Powder", Unit: "g", Cost_Per_Unit: 0.004, Primary_Vendor: "Kroger", Category: "Dry Goods" },
  { Ingredient_ID: "ING019", Ingredient_Name: "Chicken Breast", Unit: "g", Cost_Per_Unit: 0.0088, Primary_Vendor: "Restaurant Depot", Category: "Protein" },
  { Ingredient_ID: "ING020", Ingredient_Name: "Water", Unit: "ml", Cost_Per_Unit: 0.0001, Primary_Vendor: "N/A", Category: "Free/Negligible" },
  { Ingredient_ID: "ING021", Ingredient_Name: "Ice", Unit: "g", Cost_Per_Unit: 0.0002, Primary_Vendor: "N/A", Category: "Free/Negligible" },
];

const SEED_RECIPES = [
  { Recipe_ID: "REC001", Recipe_Name: "Chocolate Chip Cookies", Persona_Type: "Mai", Selling_Price: 2.5, Yield: 24 },
  { Recipe_ID: "REC002", Recipe_Name: "Lemon Bars", Persona_Type: "Mai", Selling_Price: 0.5, Yield: 16 },
  { Recipe_ID: "REC003", Recipe_Name: "Fudge Brownies", Persona_Type: "Mai", Selling_Price: 3.5, Yield: 16 },
  { Recipe_ID: "REC004", Recipe_Name: "Banana Bread", Persona_Type: "Mai", Selling_Price: 4, Yield: 8 },
  { Recipe_ID: "REC005", Recipe_Name: "Sugar Cookies", Persona_Type: "Mai", Selling_Price: 2, Yield: 24 },
  { Recipe_ID: "REC006", Recipe_Name: "Latte", Persona_Type: "Daniel", Selling_Price: 4.5, Yield: 1 },
  { Recipe_ID: "REC007", Recipe_Name: "Cappuccino", Persona_Type: "Daniel", Selling_Price: 4.25, Yield: 1 },
  { Recipe_ID: "REC008", Recipe_Name: "Iced Tea", Persona_Type: "Daniel", Selling_Price: 3, Yield: 1 },
  { Recipe_ID: "REC009", Recipe_Name: "Blueberry Muffin", Persona_Type: "Daniel", Selling_Price: 3.75, Yield: 12 },
  { Recipe_ID: "REC010", Recipe_Name: "Chicken Tex-Mex Tray", Persona_Type: "Albert", Selling_Price: 8, Yield: 50 },
];

const SEED_RECIPE_INGREDIENTS = [
  ["REC001","ING001",280],["REC001","ING002",150],["REC001","ING006",150],["REC001","ING003",225],
  ["REC001","ING004",2],["REC001","ING007",5],["REC001","ING008",5],["REC001","ING009",3],["REC001","ING005",300],
  ["REC002","ING001",250],["REC002","ING011",200],["REC002","ING003",225],["REC002","ING004",4],
  ["REC002","ING002",300],["REC002","ING010",4],["REC002","ING009",2],
  ["REC003","ING001",150],["REC003","ING002",300],["REC003","ING003",225],["REC003","ING004",4],
  ["REC003","ING012",80],["REC003","ING007",5],["REC003","ING009",2],["REC003","ING005",100],
  ["REC004","ING001",250],["REC004","ING002",150],["REC004","ING003",115],["REC004","ING004",2],
  ["REC004","ING013",3],["REC004","ING008",5],["REC004","ING009",2],
  ["REC005","ING001",300],["REC005","ING002",200],["REC005","ING003",225],["REC005","ING004",1],
  ["REC005","ING007",5],["REC005","ING018",5],["REC005","ING009",2],
  ["REC006","ING015",18],["REC006","ING014",200],
  ["REC007","ING015",18],["REC007","ING014",120],
  ["REC008","ING016",1],["REC008","ING020",350],["REC008","ING021",100],
  ["REC009","ING001",300],["REC009","ING002",200],["REC009","ING003",115],["REC009","ING004",2],
  ["REC009","ING014",180],["REC009","ING018",8],["REC009","ING009",3],["REC009","ING017",200],
  ["REC010","ING019",5000],["REC010","ING020",2000],["REC010","ING009",30],
].map(([Recipe_ID, Ingredient_ID, Quantity_Used]) => ({ Recipe_ID, Ingredient_ID, Quantity_Used }));

const STORAGE_KEY = "rcmr:dataset:v1";
const SHOCK_KEY = "rcmr:shocks:v1";
const HISTORY_KEY = "rcmr:priceHistory:v1";
const TABLEAU_KEY = "rcmr:tableauUrl:v1";
const DEFAULT_TABLEAU_URL = "https://public.tableau.com/views/RCMRDashBoard/Dashboard1";

/* ---------- Calculation helpers ---------- */

function effectiveCost(ingredient, shocks) {
  const pct = shocks[ingredient.Ingredient_ID] || 0;
  return ingredient.Cost_Per_Unit * (1 + pct / 100);
}

function recipeCost(recipe, recipeIngredients, ingredientMap, shocks) {
  const lines = recipeIngredients.filter((ri) => ri.Recipe_ID === recipe.Recipe_ID);
  let total = 0;
  for (const line of lines) {
    const ing = ingredientMap[line.Ingredient_ID];
    if (!ing) continue;
    total += Number(line.Quantity_Used) * effectiveCost(ing, shocks);
  }
  return total;
}

function thresholdFor(recipe) {
  if (recipe.Persona_Type === "Custom") {
    const t = Number(recipe.Custom_Threshold_Pct);
    return Number.isFinite(t) ? t / 100 : 0.1;
  }
  return THRESHOLDS[recipe.Persona_Type] ?? 0.1;
}

function computeRow(recipe, recipeIngredients, ingredientMap, shocks) {
  const totalCost = recipeCost(recipe, recipeIngredients, ingredientMap, shocks);
  const yieldVal = Number(recipe.Yield) || 1;
  const costPerServing = totalCost / yieldVal;
  const price = Number(recipe.Selling_Price) || 0;
  const margin = price > 0 ? (price - costPerServing) / price : -Infinity;
  const threshold = thresholdFor(recipe);
  const gap = threshold - margin;
  let severity = "clear";
  if (margin < 0) severity = "critical";
  else if (gap > 0.05) severity = "breach-high";
  else if (gap > 0) severity = "breach-moderate";
  return { ...recipe, totalCost, costPerServing, margin, threshold, gap, severity, atRisk: gap > 0 };
}

const fmtPct = (v) => (Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : "—");
const fmtUsd = (v) => (Number.isFinite(v) ? `$${v.toFixed(4)}` : "—");
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const todayStr = () => new Date().toISOString().slice(0, 10);
const sortByName = (arr) => [...arr].sort((a, b) => a.Ingredient_Name.localeCompare(b.Ingredient_Name));

const SEVERITY_LABEL = {
  critical: "CRITICAL LOSS",
  "breach-high": "BREACH — HIGH",
  "breach-moderate": "BREACH — WATCH",
  clear: "CLEAR",
};
const SEVERITY_COLOR = {
  critical: { bg: TOKENS.wineSoft, fg: TOKENS.wine, border: TOKENS.wine },
  "breach-high": { bg: TOKENS.wineSoft, fg: TOKENS.wine, border: TOKENS.wine },
  "breach-moderate": { bg: TOKENS.amberSoft, fg: TOKENS.amber, border: TOKENS.amber },
  clear: { bg: TOKENS.sageSoft, fg: TOKENS.sage, border: TOKENS.sage },
};

function useFonts() {
  useEffect(() => {
    const id = "rcmr-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500;600&family=Public+Sans:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

/* ---------- Main component ---------- */

export default function RCMRConsole() {
  useFonts();
  const [ingredients, setIngredients] = useState(SEED_INGREDIENTS);
  const [recipes, setRecipes] = useState(SEED_RECIPES);
  const [recipeIngredients, setRecipeIngredients] = useState(SEED_RECIPE_INGREDIENTS);
  const [shocks, setShocks] = useState({});
  const [priceHistory, setPriceHistory] = useState({});
  const [tableauUrl, setTableauUrl] = useState(DEFAULT_TABLEAU_URL);
  const [tab, setTab] = useState("dashboard");
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await storage.get(STORAGE_KEY, false);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          if (parsed.ingredients) setIngredients(parsed.ingredients);
          if (parsed.recipes) setRecipes(parsed.recipes);
          if (parsed.recipeIngredients) setRecipeIngredients(parsed.recipeIngredients);
        }
      } catch (e) {}
      try {
        const res2 = await storage.get(SHOCK_KEY, false);
        if (res2 && res2.value) setShocks(JSON.parse(res2.value));
      } catch (e) {}
      try {
        const res3 = await storage.get(HISTORY_KEY, false);
        if (res3 && res3.value) setPriceHistory(JSON.parse(res3.value));
      } catch (e) {}
      try {
        const res4 = await storage.get(TABLEAU_KEY, false);
        if (res4 && res4.value) setTableauUrl(JSON.parse(res4.value));
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await storage.set(STORAGE_KEY, JSON.stringify({ ingredients, recipes, recipeIngredients }), false);
      } catch (e) {
        console.error("Save failed", e);
      }
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [ingredients, recipes, recipeIngredients, loaded]);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await storage.set(SHOCK_KEY, JSON.stringify(shocks), false);
      } catch (e) {}
    })();
  }, [shocks, loaded]);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await storage.set(HISTORY_KEY, JSON.stringify(priceHistory), false);
      } catch (e) {}
    })();
  }, [priceHistory, loaded]);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await storage.set(TABLEAU_KEY, JSON.stringify(tableauUrl), false);
      } catch (e) {}
    })();
  }, [tableauUrl, loaded]);

  const ingredientMap = useMemo(() => {
    const m = {};
    ingredients.forEach((i) => (m[i.Ingredient_ID] = i));
    return m;
  }, [ingredients]);

  const computedRecipes = useMemo(
    () => recipes.map((r) => computeRow(r, recipeIngredients, ingredientMap, shocks)),
    [recipes, recipeIngredients, ingredientMap, shocks]
  );

  const showToast = (msg, kind = "info") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3600);
  };

  const resetToDemo = async () => {
    setIngredients(SEED_INGREDIENTS);
    setRecipes(SEED_RECIPES);
    setRecipeIngredients(SEED_RECIPE_INGREDIENTS);
    setShocks({});
    setPriceHistory({});
    try {
      await storage.delete(STORAGE_KEY, false);
      await storage.delete(SHOCK_KEY, false);
      await storage.delete(HISTORY_KEY, false);
    } catch (e) {}
    showToast("Reset to demo dataset.", "info");
  };

  const recordPriceUpdate = (ingredientId, newCostRaw, dateRaw) => {
    const prevCost = ingredientMap[ingredientId]?.Cost_Per_Unit;
    const newCost = Number(newCostRaw);
    if (!(newCost > 0)) {
      showToast("Enter a valid new cost greater than 0.", "error");
      return;
    }
    const pctChange = prevCost ? (newCost - prevCost) / prevCost : 0;
    const warning = pctChange > 0.1;
    const entry = {
      date: dateRaw || todayStr(),
      prevCost,
      newCost,
      pctChange,
      warning,
      recordedAt: new Date().toISOString(),
    };
    setIngredients((prev) =>
      prev.map((i) => (i.Ingredient_ID === ingredientId ? { ...i, Cost_Per_Unit: newCost } : i))
    );
    setPriceHistory((prev) => ({
      ...prev,
      [ingredientId]: [...(prev[ingredientId] || []), entry],
    }));
    const name = ingredientMap[ingredientId]?.Ingredient_Name || ingredientId;
    showToast(
      warning
        ? `Flagged: ${name} rose ${(pctChange * 100).toFixed(1)}% vs. last recorded price.`
        : `${name} price updated.`,
      warning ? "warning" : "info"
    );
  };

  return (
    <div style={{ fontFamily: "'Public Sans', sans-serif", background: TOKENS.parchment, minHeight: "100%", color: TOKENS.ink }}>
      <Header tab={tab} setTab={setTab} atRiskCount={computedRecipes.filter((r) => r.atRisk).length} />

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 20px 64px" }}>
        {tab === "dashboard" && <DashboardTab rows={computedRecipes} />}
        {tab === "recipes" && (
          <RecipesTab
            recipes={recipes}
            setRecipes={setRecipes}
            ingredients={ingredients}
            setIngredients={setIngredients}
            recipeIngredients={recipeIngredients}
            setRecipeIngredients={setRecipeIngredients}
            computedRecipes={computedRecipes}
            showToast={showToast}
          />
        )}
        {tab === "shocks" && (
          <ShockTab
            ingredients={ingredients}
            shocks={shocks}
            setShocks={setShocks}
            rows={computedRecipes}
            recipes={recipes}
            recipeIngredients={recipeIngredients}
          />
        )}
        {tab === "priceupdates" && (
          <PriceUpdatesTab
            ingredients={ingredients}
            priceHistory={priceHistory}
            recordPriceUpdate={recordPriceUpdate}
            recipeIngredients={recipeIngredients}
            recipes={recipes}
          />
        )}
        {tab === "insights" && (
          <InsightsTab
            tableauUrl={tableauUrl}
            setTableauUrl={setTableauUrl}
            rows={computedRecipes}
            ingredients={ingredients}
            priceHistory={priceHistory}
          />
        )}
        {tab === "data" && (
          <DataTab
            setIngredients={setIngredients}
            setRecipes={setRecipes}
            setRecipeIngredients={setRecipeIngredients}
            resetToDemo={resetToDemo}
            showToast={showToast}
          />
        )}
      </main>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: toast.kind === "warning" ? TOKENS.amber : TOKENS.ink,
            color: TOKENS.textOnInk,
            padding: "10px 18px",
            borderRadius: 6,
            fontSize: 13,
            fontFamily: "'IBM Plex Mono', monospace",
            boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
            zIndex: 50,
            maxWidth: "80vw",
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ---------- Header ---------- */

function Header({ tab, setTab, atRiskCount }) {
  const tabs = [
    { id: "dashboard", label: "Overview" },
    { id: "recipes", label: "Recipes" },
    { id: "shocks", label: "Price Shocks" },
    { id: "priceupdates", label: "Price Log" },
    { id: "insights", label: "Insights" },
    { id: "data", label: "Data" },
  ];
  return (
    <header style={{ background: TOKENS.ink, color: TOKENS.textOnInk }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "22px 20px 0", display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.14em", color: TOKENS.gold, textTransform: "uppercase", marginBottom: 4 }}>
            Recipe Cost &amp; Margin Risk — Console
          </div>
          <h1 style={{ fontFamily: "'Spectral', serif", fontWeight: 500, fontSize: 28, margin: 0, fontStyle: "italic" }}>
            Every recipe, priced like a position.
          </h1>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, textAlign: "right", color: atRiskCount > 0 ? "#E8A9AD" : "#9FC7B0" }}>
          {atRiskCount > 0 ? `${atRiskCount} RECIPE${atRiskCount > 1 ? "S" : ""} IN BREACH` : "ALL RECIPES CLEAR"}
        </div>
      </div>
      <nav style={{ maxWidth: 1080, margin: "18px auto 0", padding: "0 20px", display: "flex", gap: 4, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? TOKENS.parchment : "transparent",
              color: tab === t.id ? TOKENS.ink : TOKENS.textOnInk,
              border: "none",
              borderTopLeftRadius: 6,
              borderTopRightRadius: 6,
              padding: "9px 14px",
              fontFamily: "'Public Sans', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              opacity: tab === t.id ? 1 : 0.75,
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

/* ---------- Small building blocks ---------- */

function Panel({ children, style }) {
  return <div style={{ background: "#FFFFFF", border: `1px solid ${TOKENS.rule}`, borderRadius: 8, padding: 20, ...style }}>{children}</div>;
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: TOKENS.textOnParchmentMuted, marginBottom: 10 }}>
      {children}
    </div>
  );
}

function Num({ children }) {
  return <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontVariantNumeric: "tabular-nums" }}>{children}</span>;
}

const inputStyle = {
  fontFamily: "'Public Sans', sans-serif",
  fontSize: 13.5,
  padding: "8px 10px",
  border: `1px solid ${TOKENS.rule}`,
  borderRadius: 5,
  background: "#FFFFFF",
  color: TOKENS.ink,
};
const primaryBtnStyle = { background: TOKENS.ink, color: TOKENS.textOnInk, border: "none", borderRadius: 6, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const ghostBtnStyle = { background: "transparent", color: TOKENS.ink, border: `1px solid ${TOKENS.rule}`, borderRadius: 6, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" };

function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace", color: TOKENS.textOnParchmentMuted }}>{label}</span>
      {children}
    </label>
  );
}

/* ---------- Overview Tab (formerly "Risk Register") ---------- */

function RangeField({ label, minVal, maxVal, onMin, onMax }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace", color: TOKENS.textOnParchmentMuted }}>{label}</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input style={{ ...inputStyle, width: "100%" }} type="number" placeholder="min" value={minVal} onChange={onMin} />
        <span style={{ color: TOKENS.textOnParchmentMuted, fontSize: 12 }}>–</span>
        <input style={{ ...inputStyle, width: "100%" }} type="number" placeholder="max" value={maxVal} onChange={onMax} />
      </div>
    </div>
  );
}

function DashboardTab({ rows }) {
  const [filters, setFilters] = useState({
    recipeQuery: "",
    persona: "All",
    status: "All",
    threshold: "All",
    costMin: "",
    costMax: "",
    priceMin: "",
    priceMax: "",
    marginMin: "",
    marginMax: "",
  });
  const [showMore, setShowMore] = useState(false);

  const personaOptions = useMemo(() => ["All", ...new Set(rows.map((r) => r.Persona_Type))], [rows]);
  const thresholdOptions = useMemo(
    () => ["All", ...new Set(rows.map((r) => Math.round(r.threshold * 100)))].sort((a, b) => (a === "All" ? -1 : b === "All" ? 1 : a - b)),
    [rows]
  );

  const filtered = rows.filter((r) => {
    if (filters.recipeQuery && !r.Recipe_Name.toLowerCase().includes(filters.recipeQuery.toLowerCase())) return false;
    if (filters.persona !== "All" && r.Persona_Type !== filters.persona) return false;
    if (filters.status !== "All" && r.severity !== filters.status) return false;
    if (filters.threshold !== "All" && Math.round(r.threshold * 100) !== Number(filters.threshold)) return false;
    if (filters.costMin !== "" && r.costPerServing < Number(filters.costMin)) return false;
    if (filters.costMax !== "" && r.costPerServing > Number(filters.costMax)) return false;
    if (filters.priceMin !== "" && r.Selling_Price < Number(filters.priceMin)) return false;
    if (filters.priceMax !== "" && r.Selling_Price > Number(filters.priceMax)) return false;
    if (filters.marginMin !== "" && r.margin * 100 < Number(filters.marginMin)) return false;
    if (filters.marginMax !== "" && r.margin * 100 > Number(filters.marginMax)) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => a.margin - b.margin);
  const breached = sorted.filter((r) => r.atRisk);
  const clearFilters = () =>
    setFilters({ recipeQuery: "", persona: "All", status: "All", threshold: "All", costMin: "", costMax: "", priceMin: "", priceMax: "", marginMin: "", marginMax: "" });

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <SectionLabel>At-risk recipes</SectionLabel>
        {breached.length === 0 ? (
          <Panel style={{ borderColor: TOKENS.sage, background: TOKENS.sageSoft }}>
            <div style={{ fontFamily: "'Spectral', serif", fontStyle: "italic", fontSize: 16 }}>
              No breaches on record among recipes matching your filters.
            </div>
          </Panel>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {breached.map((r) => (
              <RiskCard key={r.Recipe_ID} row={r} />
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <SectionLabel>All recipes — ranked by margin</SectionLabel>
          <button onClick={clearFilters} style={ghostBtnStyle}>Clear filters</button>
        </div>

        <Panel style={{ marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 16, alignItems: "end" }}>
            <Field label="Search recipe">
              <input style={inputStyle} placeholder="Type a name..." value={filters.recipeQuery} onChange={set("recipeQuery")} />
            </Field>
            <Field label="Persona">
              <select style={inputStyle} value={filters.persona} onChange={set("persona")}>
                {personaOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select style={inputStyle} value={filters.status} onChange={set("status")}>
                <option value="All">All</option>
                <option value="critical">Critical Loss</option>
                <option value="breach-high">Breach — High</option>
                <option value="breach-moderate">Breach — Watch</option>
                <option value="clear">Clear</option>
              </select>
            </Field>
            <button onClick={() => setShowMore((s) => !s)} style={{ ...ghostBtnStyle, whiteSpace: "nowrap", height: 37 }}>
              {showMore ? "Fewer filters ▲" : "More filters ▾"}
            </button>
          </div>

          {showMore && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
                marginTop: 18,
                paddingTop: 18,
                borderTop: `1px solid ${TOKENS.rule}`,
              }}
            >
              <Field label="Threshold">
                <select style={inputStyle} value={filters.threshold} onChange={set("threshold")}>
                  {thresholdOptions.map((t) => <option key={t} value={t}>{t === "All" ? "All" : `${t}%`}</option>)}
                </select>
              </Field>
              <RangeField label="Cost / Serving ($)" minVal={filters.costMin} maxVal={filters.costMax} onMin={set("costMin")} onMax={set("costMax")} />
              <RangeField label="Selling Price ($)" minVal={filters.priceMin} maxVal={filters.priceMax} onMin={set("priceMin")} onMax={set("priceMax")} />
              <RangeField label="Margin (%)" minVal={filters.marginMin} maxVal={filters.marginMax} onMin={set("marginMin")} onMax={set("marginMax")} />
            </div>
          )}
        </Panel>

        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: TOKENS.parchmentDim, textAlign: "left" }}>
                {["Recipe", "Persona", "Cost / Serving", "Selling Price", "Margin %", "Threshold", "Status"].map((h) => (
                  <th key={h} style={{ padding: "9px 14px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: TOKENS.textOnParchmentMuted, borderBottom: `1px solid ${TOKENS.rule}` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 18, textAlign: "center", color: TOKENS.textOnParchmentMuted }}>No recipes match these filters.</td></tr>
              )}
              {sorted.map((r) => {
                const c = SEVERITY_COLOR[r.severity];
                return (
                  <tr key={r.Recipe_ID} style={{ borderBottom: `1px solid ${TOKENS.rule}` }}>
                    <td style={{ padding: "10px 14px", fontFamily: "'Spectral', serif", fontSize: 15 }}>{r.Recipe_Name}</td>
                    <td style={{ padding: "10px 14px" }}>{r.Persona_Type}</td>
                    <td style={{ padding: "10px 14px" }}><Num>{fmtUsd(r.costPerServing)}</Num></td>
                    <td style={{ padding: "10px 14px" }}><Num>${Number(r.Selling_Price).toFixed(2)}</Num></td>
                    <td style={{ padding: "10px 14px" }}><Num>{fmtPct(r.margin)}</Num></td>
                    <td style={{ padding: "10px 14px", color: TOKENS.textOnParchmentMuted }}><Num>{fmtPct(r.threshold)}</Num></td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: "0.06em", padding: "3px 8px", borderRadius: 4, background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}>
                        {SEVERITY_LABEL[r.severity]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}

function RiskCard({ row }) {
  const c = SEVERITY_COLOR[row.severity];
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontFamily: "'Spectral', serif", fontSize: 17, fontWeight: 600 }}>{row.Recipe_Name}</div>
        <div style={{ fontSize: 12.5, color: c.fg, marginTop: 2 }}>
          {row.Persona_Type} threshold {fmtPct(row.threshold)} · currently <Num>{fmtPct(row.margin)}</Num> · gap <Num>{fmtPct(row.gap)}</Num>
        </div>
      </div>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.08em", padding: "5px 12px", borderRadius: 4, background: "#FFFFFF", color: c.fg, border: `1.5px solid ${c.border}`, fontWeight: 600 }}>
        {SEVERITY_LABEL[row.severity]}
      </span>
    </div>
  );
}

/* ---------- Recipes Tab ---------- */

function emptyDraft() {
  return { Recipe_ID: "", Recipe_Name: "", Persona_Type: "Mai", Custom_Threshold_Pct: "10", Selling_Price: "", Yield: "", lines: [] };
}

function RecipesTab({ recipes, setRecipes, ingredients, setIngredients, recipeIngredients, setRecipeIngredients, computedRecipes, showToast }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [newIngName, setNewIngName] = useState("");
  const [newIngUnit, setNewIngUnit] = useState("g");
  const [newIngCost, setNewIngCost] = useState("");
  const formRef = useRef(null);

  const sortedIngredients = useMemo(() => sortByName(ingredients), [ingredients]);

  useEffect(() => {
    if (editingId && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editingId]);

  const startNew = () => { setDraft(emptyDraft()); setEditingId("__new__"); setError(""); };
  const startEdit = (recipe) => {
    const lines = recipeIngredients.filter((ri) => ri.Recipe_ID === recipe.Recipe_ID).map((ri) => ({ Ingredient_ID: ri.Ingredient_ID, Quantity_Used: ri.Quantity_Used }));
    setDraft({ ...recipe, Custom_Threshold_Pct: recipe.Custom_Threshold_Pct ?? "10", lines });
    setEditingId(recipe.Recipe_ID);
    setError("");
  };
  const cancel = () => { setDraft(null); setEditingId(null); setError(""); };
  const addLine = () => {
    if (sortedIngredients.length === 0) return;
    setDraft((d) => ({ ...d, lines: [...d.lines, { Ingredient_ID: sortedIngredients[0].Ingredient_ID, Quantity_Used: 1 }] }));
  };
  const updateLine = (idx, patch) => setDraft((d) => { const lines = [...d.lines]; lines[idx] = { ...lines[idx], ...patch }; return { ...d, lines }; });
  const removeLine = (idx) => setDraft((d) => ({ ...d, lines: d.lines.filter((_, i) => i !== idx) }));

  const addNewIngredient = () => {
    if (!newIngName.trim() || newIngCost === "") { showToast("Enter a name and cost for the new ingredient.", "error"); return; }
    const id = uid("ING");
    setIngredients((prev) => [...prev, { Ingredient_ID: id, Ingredient_Name: newIngName.trim(), Unit: newIngUnit, Cost_Per_Unit: Number(newIngCost), Primary_Vendor: "Custom", Category: "Custom" }]);
    setDraft((d) => ({ ...d, lines: [...d.lines, { Ingredient_ID: id, Quantity_Used: 1 }] }));
    setNewIngName(""); setNewIngCost("");
    showToast(`Added ingredient "${newIngName.trim()}".`, "info");
  };

  const validate = (d) => {
    if (!d.Recipe_Name.trim()) return "Recipe name is required.";
    if (!(Number(d.Selling_Price) > 0)) return "Selling price must be greater than 0.";
    if (!(Number(d.Yield) > 0)) return "Yield must be greater than 0.";
    if (d.lines.length === 0) return "Add at least one ingredient line.";
    for (const l of d.lines) if (!(Number(l.Quantity_Used) > 0)) return "Every ingredient line needs a quantity greater than 0.";
    if (d.Persona_Type === "Custom") {
      const t = Number(d.Custom_Threshold_Pct);
      if (!(t >= 0 && t <= 50)) return "Custom threshold must be between 0% and 50%.";
    }
    return "";
  };

  const save = () => {
    const err = validate(draft);
    if (err) { setError(err); return; }
    const isNew = editingId === "__new__";
    const recipeId = isNew ? uid("REC") : editingId;
    const savedRecipe = {
      Recipe_ID: recipeId,
      Recipe_Name: draft.Recipe_Name.trim(),
      Persona_Type: draft.Persona_Type,
      Custom_Threshold_Pct: draft.Persona_Type === "Custom" ? Number(draft.Custom_Threshold_Pct) : undefined,
      Selling_Price: Number(draft.Selling_Price),
      Yield: Number(draft.Yield),
    };
    setRecipes((prev) => (isNew ? [...prev, savedRecipe] : prev.map((r) => (r.Recipe_ID === recipeId ? savedRecipe : r))));
    setRecipeIngredients((prev) => {
      const others = prev.filter((ri) => ri.Recipe_ID !== recipeId);
      const newLines = draft.lines.map((l) => ({ Recipe_ID: recipeId, Ingredient_ID: l.Ingredient_ID, Quantity_Used: Number(l.Quantity_Used) }));
      return [...others, ...newLines];
    });
    showToast(isNew ? "Recipe added." : "Recipe updated.", "info");
    cancel();
  };

  const remove = (recipeId) => {
    setRecipes((prev) => prev.filter((r) => r.Recipe_ID !== recipeId));
    setRecipeIngredients((prev) => prev.filter((ri) => ri.Recipe_ID !== recipeId));
    showToast("Recipe deleted.", "info");
    if (editingId === recipeId) cancel();
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionLabel>Recipes ({recipes.length})</SectionLabel>
        {!draft && <button onClick={startNew} style={primaryBtnStyle}>+ Add recipe</button>}
      </div>

      {draft && (
        <Panel style={{ borderColor: TOKENS.gold }} >
          <div ref={formRef} />
          <div style={{ fontFamily: "'Spectral', serif", fontSize: 18, marginBottom: 14, fontStyle: "italic" }}>
            {editingId === "__new__" ? "New recipe" : `Editing: ${draft.Recipe_Name || "—"}`}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 4 }}>
            <Field label="Recipe name">
              <input style={inputStyle} value={draft.Recipe_Name} onChange={(e) => setDraft({ ...draft, Recipe_Name: e.target.value })} />
            </Field>
            <Field label="Selling price ($ per serving)">
              <input style={inputStyle} type="number" step="0.01" value={draft.Selling_Price} onChange={(e) => setDraft({ ...draft, Selling_Price: e.target.value })} />
            </Field>
            <Field label="Yield (servings per batch)">
              <input style={inputStyle} type="number" value={draft.Yield} onChange={(e) => setDraft({ ...draft, Yield: e.target.value })} />
            </Field>
          </div>
          <div style={{ fontSize: 11.5, color: TOKENS.textOnParchmentMuted, marginBottom: 14, marginTop: 2 }}>
            Selling price is what you charge for <strong>one serving</strong> — e.g. one cookie, one latte, one tray-serving —
            not the price of the whole batch. Margin is calculated as (selling price − cost per serving) ÷ selling price,
            where cost per serving = total batch cost ÷ yield.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <Field label="Persona">
              <select style={inputStyle} value={draft.Persona_Type} onChange={(e) => setDraft({ ...draft, Persona_Type: e.target.value })}>
                <option value="Mai">Mai — home baker (20%)</option>
                <option value="Daniel">Daniel — café owner (10%)</option>
                <option value="Albert">Albert — caterer (10%)</option>
                <option value="Custom">Custom threshold</option>
              </select>
            </Field>
            {draft.Persona_Type === "Custom" && (
              <Field label="Custom threshold (%, 0–50)">
                <input style={inputStyle} type="number" min="0" max="50" value={draft.Custom_Threshold_Pct} onChange={(e) => setDraft({ ...draft, Custom_Threshold_Pct: e.target.value })} />
              </Field>
            )}
          </div>

          <SectionLabel>Ingredient lines</SectionLabel>
          <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
            {draft.lines.map((line, idx) => (
              <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select style={{ ...inputStyle, flex: 2 }} value={line.Ingredient_ID} onChange={(e) => updateLine(idx, { Ingredient_ID: e.target.value })}>
                  {sortedIngredients.map((i) => (
                    <option key={i.Ingredient_ID} value={i.Ingredient_ID}>{i.Ingredient_Name} ({i.Unit}) — ${i.Cost_Per_Unit}/unit</option>
                  ))}
                </select>
                <input style={{ ...inputStyle, flex: 1 }} type="number" step="any" value={line.Quantity_Used} onChange={(e) => updateLine(idx, { Quantity_Used: e.target.value })} placeholder="Qty" />
                <button onClick={() => removeLine(idx)} style={ghostBtnStyle}>Remove</button>
              </div>
            ))}
            <button onClick={addLine} style={{ ...ghostBtnStyle, alignSelf: "start" }}>+ Add ingredient line</button>
          </div>

          <div style={{ background: TOKENS.parchmentDim, borderRadius: 6, padding: 12, marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", width: "100%", opacity: 0.7 }}>Ingredient not in the list yet? Add it here:</div>
            <input style={{ ...inputStyle, flex: 2 }} placeholder="New ingredient name" value={newIngName} onChange={(e) => setNewIngName(e.target.value)} />
            <select style={{ ...inputStyle, flex: 1 }} value={newIngUnit} onChange={(e) => setNewIngUnit(e.target.value)}>
              {["g", "ml", "ea"].map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <input style={{ ...inputStyle, flex: 1 }} type="number" step="0.0001" placeholder="Cost/unit ($)" value={newIngCost} onChange={(e) => setNewIngCost(e.target.value)} />
            <button onClick={addNewIngredient} style={ghostBtnStyle}>+ Add &amp; use</button>
          </div>

          {error && <div style={{ color: TOKENS.wine, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>{error}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={save} style={primaryBtnStyle}>Save recipe</button>
            <button onClick={cancel} style={ghostBtnStyle}>Cancel</button>
          </div>
        </Panel>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {computedRecipes.map((r) => {
          const c = SEVERITY_COLOR[r.severity];
          return (
            <Panel key={r.Recipe_ID} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontFamily: "'Spectral', serif", fontSize: 17 }}>{r.Recipe_Name}</div>
                <div style={{ fontSize: 12.5, color: TOKENS.textOnParchmentMuted, marginTop: 2 }}>
                  {r.Persona_Type} · margin <Num>{fmtPct(r.margin)}</Num> vs threshold <Num>{fmtPct(r.threshold)}</Num>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, padding: "3px 8px", borderRadius: 4, background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}>{SEVERITY_LABEL[r.severity]}</span>
                <button onClick={() => startEdit(r)} style={ghostBtnStyle}>Edit</button>
                <button onClick={() => remove(r.Recipe_ID)} style={{ ...ghostBtnStyle, color: TOKENS.wine, borderColor: TOKENS.wine }}>Delete</button>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Price Shock Tab ---------- */

function ShockTab({ ingredients, shocks, setShocks, rows, recipes, recipeIngredients }) {
  const [query, setQuery] = useState("");
  const [recipeFilter, setRecipeFilter] = useState("All");

  const usedIngredientIds = useMemo(() => new Set(recipeIngredients.map((ri) => ri.Ingredient_ID)), [recipeIngredients]);
  const idsForRecipe = useMemo(() => {
    if (recipeFilter === "All") return null;
    return new Set(recipeIngredients.filter((ri) => ri.Recipe_ID === recipeFilter).map((ri) => ri.Ingredient_ID));
  }, [recipeFilter, recipeIngredients]);

  const filtered = sortByName(ingredients)
    .filter((i) => usedIngredientIds.has(i.Ingredient_ID))
    .filter((i) => !idsForRecipe || idsForRecipe.has(i.Ingredient_ID))
    .filter((i) => i.Ingredient_Name.toLowerCase().includes(query.toLowerCase()));

  const activeShockIds = Object.entries(shocks).filter(([, v]) => v && v !== 0).map(([k]) => k);
  const setShock = (id, val) => setShocks((s) => ({ ...s, [id]: val }));
  const clearAll = () => setShocks({});
  const impacted = [...rows].filter(() => activeShockIds.length > 0).sort((a, b) => a.margin - b.margin);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 24 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <SectionLabel>Ingredients — apply price shocks</SectionLabel>
          <button onClick={clearAll} style={ghostBtnStyle}>Reset all shocks</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <input style={inputStyle} placeholder="Search ingredient..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <select style={inputStyle} value={recipeFilter} onChange={(e) => setRecipeFilter(e.target.value)}>
            <option value="All">All recipes</option>
            {recipes.map((r) => <option key={r.Recipe_ID} value={r.Recipe_ID}>{r.Recipe_Name}</option>)}
          </select>
        </div>
        <div style={{ display: "grid", gap: 10, maxHeight: 560, overflowY: "auto", paddingRight: 4 }}>
          {filtered.map((ing) => {
            const val = shocks[ing.Ingredient_ID] || 0;
            const active = val !== 0;
            const shockedCost = ing.Cost_Per_Unit * (1 + val / 100);
            return (
              <Panel key={ing.Ingredient_ID} style={{ padding: 14, borderColor: active ? TOKENS.gold : TOKENS.rule }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: "'Spectral', serif", fontSize: 15 }}>{ing.Ingredient_Name}</span>
                  <Num>
                    <span style={{ color: active ? (val > 0 ? TOKENS.wine : TOKENS.sage) : TOKENS.textOnParchmentMuted }}>
                      {val > 0 ? "+" : ""}{val}%
                    </span>
                  </Num>
                </div>
                <input type="range" min={-50} max={100} step={1} value={val} onChange={(e) => setShock(ing.Ingredient_ID, Number(e.target.value))} style={{ width: "100%", accentColor: TOKENS.gold }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: TOKENS.textOnParchmentMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
                  <span>-50%</span>
                  <span>+100%</span>
                </div>
                <div style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", marginTop: 6, display: "flex", justifyContent: "space-between", borderTop: `1px dashed ${TOKENS.rule}`, paddingTop: 6 }}>
                  <span>Baseline: <Num>${ing.Cost_Per_Unit.toFixed(4)}/{ing.Unit}</Num></span>
                  <span style={{ color: active ? (val > 0 ? TOKENS.wine : TOKENS.sage) : TOKENS.ink, fontWeight: 600 }}>
                    Shocked: <Num>${shockedCost.toFixed(4)}/{ing.Unit}</Num>
                  </span>
                </div>
              </Panel>
            );
          })}
          {filtered.length === 0 && <div style={{ color: TOKENS.textOnParchmentMuted, fontSize: 13 }}>No ingredients match this filter.</div>}
        </div>
      </div>

      <div>
        <SectionLabel>
          {activeShockIds.length === 0 ? "No active shocks — all recipes at baseline" : `Live impact — ${activeShockIds.length} ingredient${activeShockIds.length > 1 ? "s" : ""} shocked`}
        </SectionLabel>
        <div style={{ display: "grid", gap: 10 }}>
          {(activeShockIds.length === 0 ? rows : impacted).map((r) => {
            const c = SEVERITY_COLOR[r.severity];
            return (
              <Panel key={r.Recipe_ID} style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "'Spectral', serif", fontSize: 15 }}>{r.Recipe_Name}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, padding: "3px 8px", borderRadius: 4, background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}>{SEVERITY_LABEL[r.severity]}</span>
                </div>
                <div style={{ fontSize: 12.5, color: TOKENS.textOnParchmentMuted, marginTop: 4 }}>
                  Cost/serving <Num>{fmtUsd(r.costPerServing)}</Num> · margin <Num>{fmtPct(r.margin)}</Num> · threshold <Num>{fmtPct(r.threshold)}</Num>
                </div>
              </Panel>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Price Log Tab (permanent updates + trend warnings — US-2/AC2) ---------- */

function PriceUpdatesTab({ ingredients, priceHistory, recordPriceUpdate, recipeIngredients, recipes }) {
  const [drafts, setDrafts] = useState({});
  const [onlyWarnings, setOnlyWarnings] = useState(false);
  const sorted = useMemo(() => sortByName(ingredients), [ingredients]);

  const recipeNameById = useMemo(() => {
    const m = {};
    recipes.forEach((r) => (m[r.Recipe_ID] = r.Recipe_Name));
    return m;
  }, [recipes]);

  const affectedRecipeNames = (ingredientId) =>
    recipeIngredients.filter((ri) => ri.Ingredient_ID === ingredientId).map((ri) => recipeNameById[ri.Recipe_ID]).filter(Boolean);

  const log = useMemo(() => {
    const rows = [];
    Object.entries(priceHistory).forEach(([ingId, entries]) => {
      const name = ingredients.find((i) => i.Ingredient_ID === ingId)?.Ingredient_Name || ingId;
      entries.forEach((e) => rows.push({ ...e, ingId, name }));
    });
    rows.sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1));
    return onlyWarnings ? rows.filter((r) => r.warning) : rows;
  }, [priceHistory, ingredients, onlyWarnings]);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Panel style={{ background: TOKENS.amberSoft, borderColor: TOKENS.amber }}>
        <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>
          Record a real, permanent ingredient price update here (not a what-if — use <strong>Price Shocks</strong> for
          that). Any update that's <strong>more than 10% above the ingredient's last recorded price</strong> is
          automatically flagged as a warning below, along with every recipe that uses it.
        </div>
      </Panel>

      <div>
        <SectionLabel>Update an ingredient's price</SectionLabel>
        <div style={{ display: "grid", gap: 10 }}>
          {sorted.map((ing) => {
            const d = drafts[ing.Ingredient_ID] || {};
            return (
              <Panel key={ing.Ingredient_ID} style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontFamily: "'Spectral', serif", fontSize: 15 }}>{ing.Ingredient_Name}</div>
                  <div style={{ fontSize: 11.5, color: TOKENS.textOnParchmentMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
                    current <Num>${ing.Cost_Per_Unit.toFixed(4)}/{ing.Unit}</Num>
                  </div>
                </div>
                <Field label="New cost/unit ($)">
                  <input style={{ ...inputStyle, width: 120 }} type="number" step="0.0001" value={d.cost ?? ""} onChange={(e) => setDrafts((p) => ({ ...p, [ing.Ingredient_ID]: { ...d, cost: e.target.value } }))} />
                </Field>
                <Field label="Effective date">
                  <input style={{ ...inputStyle, width: 150 }} type="date" value={d.date ?? todayStr()} onChange={(e) => setDrafts((p) => ({ ...p, [ing.Ingredient_ID]: { ...d, date: e.target.value } }))} />
                </Field>
                <button
                  style={primaryBtnStyle}
                  onClick={() => {
                    recordPriceUpdate(ing.Ingredient_ID, d.cost, d.date);
                    setDrafts((p) => ({ ...p, [ing.Ingredient_ID]: { cost: "", date: todayStr() } }));
                  }}
                >
                  Record update
                </button>
              </Panel>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <SectionLabel>Price update log</SectionLabel>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontFamily: "'IBM Plex Mono', monospace" }}>
            <input type="checkbox" checked={onlyWarnings} onChange={(e) => setOnlyWarnings(e.target.checked)} />
            Show only warnings
          </label>
        </div>
        {log.length === 0 ? (
          <Panel><div style={{ color: TOKENS.textOnParchmentMuted, fontSize: 13 }}>No price updates recorded yet.</div></Panel>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {log.map((entry, idx) => {
              const c = entry.warning ? SEVERITY_COLOR["breach-high"] : SEVERITY_COLOR.clear;
              const affected = affectedRecipeNames(entry.ingId);
              return (
                <Panel key={idx} style={{ borderColor: c.border, background: entry.warning ? c.bg : "#FFFFFF" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <span style={{ fontFamily: "'Spectral', serif", fontSize: 15 }}>{entry.name}</span>
                      <span style={{ fontSize: 12, color: TOKENS.textOnParchmentMuted, marginLeft: 10, fontFamily: "'IBM Plex Mono', monospace" }}>{entry.date}</span>
                    </div>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, padding: "3px 8px", borderRadius: 4, background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}>
                      {entry.warning ? "PRICE WARNING — TREND FLAG" : "RECORDED"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, marginTop: 6 }}>
                    <Num>${entry.prevCost?.toFixed(4)}</Num> → <Num>${entry.newCost.toFixed(4)}</Num> (
                    <Num style={{ color: entry.pctChange > 0 ? TOKENS.wine : TOKENS.sage }}>
                      {entry.pctChange >= 0 ? "+" : ""}{(entry.pctChange * 100).toFixed(1)}%
                    </Num>
                    )
                  </div>
                  {entry.warning && affected.length > 0 && (
                    <div style={{ fontSize: 12, color: TOKENS.wine, marginTop: 6 }}>
                      Affects: {affected.join(", ")}
                    </div>
                  )}
                </Panel>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Insights Tab: live BI charts (from the tool's own data) + Tableau embed ---------- */

const SEVERITY_HEX = {
  critical: TOKENS.wine,
  "breach-high": TOKENS.wine,
  "breach-moderate": TOKENS.amber,
  clear: TOKENS.sage,
};

function ChartCard({ title, subtitle, children, height = 320 }) {
  return (
    <Panel>
      <div style={{ fontFamily: "'Spectral', serif", fontSize: 16, marginBottom: 2 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: TOKENS.textOnParchmentMuted, marginBottom: 12 }}>{subtitle}</div>}
      <div style={{ width: "100%", height }}>{children}</div>
    </Panel>
  );
}

const chartFont = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fill: TOKENS.textOnParchmentMuted };

function MarginByRecipeChart({ rows }) {
  const data = [...rows].sort((a, b) => a.margin - b.margin).map((r) => ({
    name: r.Recipe_Name.length > 14 ? r.Recipe_Name.slice(0, 13) + "…" : r.Recipe_Name,
    fullName: r.Recipe_Name,
    margin: +(r.margin * 100).toFixed(1),
    threshold: +(r.threshold * 100).toFixed(1),
    severity: r.severity,
  }));
  return (
    <ChartCard title="Margin % by recipe" subtitle="Bar color reflects live risk status — bars below their threshold line are the ones to watch">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 40 }}>
          <CartesianGrid stroke={TOKENS.rule} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} tick={chartFont} height={60} />
          <YAxis tick={chartFont} unit="%" />
          <Tooltip
            formatter={(v, k) => [`${v}%`, k === "margin" ? "Margin" : "Threshold"]}
            labelFormatter={(_, p) => p?.[0]?.payload?.fullName || ""}
            contentStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, borderColor: TOKENS.rule }}
          />
          <Bar dataKey="margin" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => <Cell key={i} fill={SEVERITY_HEX[d.severity]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function CostVsPriceChart({ rows }) {
  const data = rows.map((r) => ({
    name: r.Recipe_Name.length > 14 ? r.Recipe_Name.slice(0, 13) + "…" : r.Recipe_Name,
    fullName: r.Recipe_Name,
    "Cost / Serving": +r.costPerServing.toFixed(3),
    "Selling Price": +Number(r.Selling_Price).toFixed(2),
  }));
  return (
    <ChartCard title="Cost per serving vs. selling price" subtitle="The gap between the two bars is the margin, in dollar terms">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 40 }}>
          <CartesianGrid stroke={TOKENS.rule} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} tick={chartFont} height={60} />
          <YAxis tick={chartFont} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            formatter={(v) => `$${v}`}
            labelFormatter={(_, p) => p?.[0]?.payload?.fullName || ""}
            contentStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, borderColor: TOKENS.rule }}
          />
          <Legend wrapperStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }} />
          <Bar dataKey="Cost / Serving" fill={TOKENS.wine} radius={[3, 3, 0, 0]} />
          <Bar dataKey="Selling Price" fill={TOKENS.gold} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function RiskDonut({ rows }) {
  const counts = { clear: 0, "breach-moderate": 0, "breach-high": 0, critical: 0 };
  rows.forEach((r) => (counts[r.severity] = (counts[r.severity] || 0) + 1));
  const data = [
    { name: "Clear", key: "clear", value: counts.clear },
    { name: "Breach — Watch", key: "breach-moderate", value: counts["breach-moderate"] },
    { name: "Breach — High", key: "breach-high", value: counts["breach-high"] },
    { name: "Critical Loss", key: "critical", value: counts.critical },
  ].filter((d) => d.value > 0);
  return (
    <ChartCard title="Risk status distribution" subtitle="Share of recipes in each severity band, right now">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
            {data.map((d, i) => <Cell key={i} fill={SEVERITY_HEX[d.key]} />)}
          </Pie>
          <Legend wrapperStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }} />
          <Tooltip contentStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, borderColor: TOKENS.rule }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function PriceTrendChart({ priceHistory, ingredients }) {
  const withHistory = ingredients.filter((i) => (priceHistory[i.Ingredient_ID] || []).length > 0);
  const [selected, setSelected] = useState(withHistory[0]?.Ingredient_ID || "");

  useEffect(() => {
    if (!selected && withHistory.length > 0) setSelected(withHistory[0].Ingredient_ID);
  }, [withHistory, selected]);

  if (withHistory.length === 0) {
    return (
      <ChartCard title="Ingredient price trend" subtitle="Live-updates as you record entries in the Price Log tab" height={200}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: TOKENS.textOnParchmentMuted, fontSize: 13, textAlign: "center" }}>
          No recorded price updates yet — go to <strong>Price Log</strong> and record at least one ingredient update
          to see its trend line here.
        </div>
      </ChartCard>
    );
  }

  const entries = (priceHistory[selected] || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const data = [];
  if (entries.length > 0) data.push({ date: "baseline", cost: entries[0].prevCost });
  entries.forEach((e) => data.push({ date: e.date, cost: e.newCost, warning: e.warning }));

  return (
    <ChartCard title="Ingredient price trend" subtitle="From your Price Log — points above the +10% warning line are flagged">
      <div style={{ marginBottom: 10 }}>
        <select style={{ ...inputStyle, width: "auto" }} value={selected} onChange={(e) => setSelected(e.target.value)}>
          {withHistory.map((i) => <option key={i.Ingredient_ID} value={i.Ingredient_ID}>{i.Ingredient_Name}</option>)}
        </select>
      </div>
      <ResponsiveContainer width="100%" height={230}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid stroke={TOKENS.rule} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={chartFont} />
          <YAxis tick={chartFont} tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(v) => `$${v}`} contentStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, borderColor: TOKENS.rule }} />
          <Line type="monotone" dataKey="cost" stroke={TOKENS.gold} strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

const TABLEAU_STATIC_IMAGE = "https://public.tableau.com/static/images/RC/RCMRDashBoard/Dashboard1/1.png";

function InsightsTab({ tableauUrl, setTableauUrl, rows, ingredients, priceHistory }) {
  const [draftUrl, setDraftUrl] = useState(tableauUrl);
  const [tryInlineEmbed, setTryInlineEmbed] = useState(false);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <SectionLabel>Live data insights — updates instantly as you edit recipes, run shocks, or log price changes</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
          <MarginByRecipeChart rows={rows} />
          <RiskDonut rows={rows} />
          <CostVsPriceChart rows={rows} />
          <PriceTrendChart priceHistory={priceHistory} ingredients={ingredients} />
        </div>
      </div>

      <div>
        <SectionLabel>Published Tableau dashboard — Weeks 5–6 historical analysis</SectionLabel>
        <Panel style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: TOKENS.textOnParchmentMuted, margin: "0 0 10px" }}>
            This is your original published RCMR Tableau Public dashboard. The charts above reflect whatever data is
            currently loaded in this app; this panel reflects your fixed Week 2–6 dataset — together they show both
            the "live simulation" and "historical reporting" halves of the project.
          </p>
          <div style={{ fontSize: 12, color: TOKENS.textOnParchmentMuted, marginBottom: 10, lineHeight: 1.6 }}>
            Note: Claude's preview sandbox blocks inline embeds of most external sites, so the live interactive
            version below may not render <em>inside this chat preview</em>. Once this app is deployed to your own
            portfolio site, the inline embed should work automatically with no changes needed.
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input style={{ ...inputStyle, flex: 1 }} placeholder="https://public.tableau.com/views/..." value={draftUrl} onChange={(e) => setDraftUrl(e.target.value)} />
            <button style={primaryBtnStyle} onClick={() => setTableauUrl(draftUrl.trim())}>Save link</button>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontFamily: "'IBM Plex Mono', monospace" }}>
            <input type="checkbox" checked={tryInlineEmbed} onChange={(e) => setTryInlineEmbed(e.target.checked)} />
            Attempt inline embed anyway (works once deployed outside this preview)
          </label>
        </Panel>

        {tryInlineEmbed && tableauUrl && (
          <Panel style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
            <iframe
              title="RCMR Tableau Dashboard"
              src={`${tableauUrl}${tableauUrl.includes("?") ? "&" : "?"}:showVizHome=no&:embed=true`}
              style={{ width: "100%", height: 887, border: "none", display: "block" }}
            />
          </Panel>
        )}

        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <a href={tableauUrl || "https://public.tableau.com/views/RCMRDashBoard/Dashboard1"} target="_blank" rel="noopener noreferrer" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <img
              src={TABLEAU_STATIC_IMAGE}
              alt="RCMR Dashboard preview"
              style={{ width: "100%", display: "block", borderBottom: `1px solid ${TOKENS.rule}` }}
            />
            <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'Spectral', serif", fontSize: 15 }}>Cost Breakdown · Margin Trend · Price Heatmap · Risk Scatter</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: TOKENS.gold, fontWeight: 600 }}>Open live dashboard ↗</span>
            </div>
          </a>
        </Panel>
      </div>
    </div>
  );
}

/* ---------- Data Tab ---------- */

function DataTab({ setIngredients, setRecipes, setRecipeIngredients, resetToDemo, showToast }) {
  const parseCsvFile = (file) =>
    new Promise((resolve, reject) => {
      Papa.parse(file, { header: true, skipEmptyLines: true, complete: (res) => resolve(res.data), error: reject });
    });

  const handleThreeCsv = async (which, file) => {
    try {
      const rows = await parseCsvFile(file);
      if (rows.length === 0) { showToast("That file has no data rows — check it has a header row plus at least one data row.", "error"); return; }
      if (which === "ingredients") setIngredients(rows.map(normalizeIngredientRow));
      if (which === "recipes") setRecipes(rows.map(normalizeRecipeRow));
      if (which === "recipeIngredients") setRecipeIngredients(rows.map(normalizeRIRow));
      showToast(`Loaded ${rows.length} rows into ${which}.`, "info");
    } catch (e) {
      showToast(`Could not read that file. Make sure it's a plain .csv exported from Excel/Sheets. (${e.message || e})`, "error");
    }
  };

  const handleWorkbook = async (file) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetNames = wb.SheetNames;
      const findSheet = (needle) => sheetNames.find((n) => n.toLowerCase().includes(needle));
      const ingSheet = findSheet("ingredient");
      const riSheet = sheetNames.find((n) => n.toLowerCase().replace(/\s/g, "").includes("recipe_ingredient")) || sheetNames.find((n) => n.toLowerCase().includes("junction"));
      const recSheet = sheetNames.find((n) => n.toLowerCase().includes("recipe") && n !== riSheet);

      let count = 0;
      if (ingSheet) { setIngredients(XLSX.utils.sheet_to_json(wb.Sheets[ingSheet]).map(normalizeIngredientRow)); count++; }
      if (recSheet) { setRecipes(XLSX.utils.sheet_to_json(wb.Sheets[recSheet]).map(normalizeRecipeRow)); count++; }
      if (riSheet) { setRecipeIngredients(XLSX.utils.sheet_to_json(wb.Sheets[riSheet]).map(normalizeRIRow)); count++; }
      if (count === 0) showToast("Couldn't find matching sheet tabs. Rename your sheet tabs to include the words 'Ingredients', 'Recipes', and 'Recipe_Ingredients'.", "error");
      else showToast(`Loaded ${count} sheet(s) from your workbook.`, "info");
    } catch (e) {
      showToast(`Could not read that workbook. Make sure it's a .xlsx file. (${e.message || e})`, "error");
    }
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Panel>
        <SectionLabel>Your data, saved to your own browser</SectionLabel>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
          Everything you add, edit, or upload on this page is saved locally to <em>your</em> browser only. It will
          still be here next time you open this app on this device, but no one else who visits this page sees it —
          and it is never sent to any server. Use "Reset to demo data" any time to discard your changes and return
          to the example dataset.
        </p>
        <button onClick={resetToDemo} style={{ ...ghostBtnStyle, marginTop: 14 }}>Reset to demo data</button>
      </Panel>

      <Panel>
        <SectionLabel>Step-by-step: loading your own recipes</SectionLabel>
        <ol style={{ fontSize: 13.5, lineHeight: 1.9, paddingLeft: 20 }}>
          <li>Open Excel, Google Sheets, or Numbers and create <strong>three separate tables</strong> (or three tabs in one workbook): one for ingredients, one for recipes, one linking recipes to ingredients.</li>
          <li>Use the <strong>exact column names</strong> shown below in the first row of each table — spelling and capitalization matter, but column order does not.</li>
          <li>Give every ingredient and every recipe a unique ID in its own first column (e.g. <code>ING001</code>, <code>REC001</code>) — you'll reference these IDs in the linking table.</li>
          <li>Export each table as a <strong>.csv</strong> file (File → Download → Comma Separated Values), or keep all three as named tabs in one <strong>.xlsx</strong> file.</li>
          <li>Upload below — either the single workbook, or the three CSVs one at a time.</li>
        </ol>
      </Panel>

      <Panel>
        <SectionLabel>Upload a single Excel workbook</SectionLabel>
        <p style={{ fontSize: 13, color: TOKENS.textOnParchmentMuted, marginTop: 0 }}>
          Your workbook needs three sheet tabs, and each tab's <strong>name</strong> must contain the words
          "Ingredients", "Recipes", or "Recipe_Ingredients" (not case-sensitive) — e.g. tabs literally named
          <code> Ingredients</code>, <code> Recipes</code>, <code> Recipe_Ingredients</code> work perfectly.
        </p>
        <input type="file" accept=".xlsx,.xls" onChange={(e) => e.target.files[0] && handleWorkbook(e.target.files[0])} />
      </Panel>

      <Panel>
        <SectionLabel>Or upload three separate CSV files</SectionLabel>
        <div style={{ display: "grid", gap: 16 }}>
          <CsvUploadRow
            label="1. Ingredients.csv"
            hint="Columns: Ingredient_ID, Ingredient_Name, Unit, Cost_Per_Unit, Primary_Vendor, Category"
            example="ING001, Flour, g, 0.0022, Costco, Dry Goods"
            onFile={(f) => handleThreeCsv("ingredients", f)}
          />
          <CsvUploadRow
            label="2. Recipes.csv"
            hint="Columns: Recipe_ID, Recipe_Name, Persona_Type, Selling_Price, Yield  (Persona_Type is Mai, Daniel, Albert, or Custom)"
            example="REC001, Chocolate Chip Cookies, Mai, 2.50, 24"
            onFile={(f) => handleThreeCsv("recipes", f)}
          />
          <CsvUploadRow
            label="3. Recipe_Ingredients.csv"
            hint="Columns: Recipe_ID, Ingredient_ID, Quantity_Used  (one row per ingredient used in a recipe — this is what links the other two files together)"
            example="REC001, ING001, 280"
            onFile={(f) => handleThreeCsv("recipeIngredients", f)}
          />
        </div>
        <div style={{ marginTop: 14, fontSize: 12, color: TOKENS.textOnParchmentMuted, lineHeight: 1.7 }}>
          <strong>Common mistakes to avoid:</strong> extra blank rows at the top of the file; IDs that don't exactly
          match between files (e.g. <code>REC001</code> in Recipes.csv but <code>Rec001</code> in
          Recipe_Ingredients.csv — capitalization must match); numbers stored as text with a currency symbol like
          "$0.50" instead of a plain number.
        </div>
      </Panel>
    </div>
  );
}

function CsvUploadRow({ label, hint, example, onFile }) {
  return (
    <div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11.5, color: TOKENS.textOnParchmentMuted, marginBottom: 3 }}>{hint}</div>
      <div style={{ fontSize: 11, color: TOKENS.textOnParchmentMuted, marginBottom: 6, fontFamily: "'IBM Plex Mono', monospace" }}>Example row: {example}</div>
      <input type="file" accept=".csv" onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
    </div>
  );
}

function normalizeIngredientRow(r) {
  return {
    Ingredient_ID: String(r.Ingredient_ID ?? uid("ING")).trim(),
    Ingredient_Name: String(r.Ingredient_Name ?? "").trim(),
    Unit: String(r.Unit ?? "").trim(),
    Cost_Per_Unit: Number(r.Cost_Per_Unit) || 0,
    Primary_Vendor: String(r.Primary_Vendor ?? "").trim(),
    Category: String(r.Category ?? "").trim(),
  };
}
function normalizeRecipeRow(r) {
  return {
    Recipe_ID: String(r.Recipe_ID ?? uid("REC")).trim(),
    Recipe_Name: String(r.Recipe_Name ?? "").trim(),
    Persona_Type: String(r.Persona_Type ?? "Mai").trim(),
    Custom_Threshold_Pct: r.Custom_Threshold_Pct !== undefined ? Number(r.Custom_Threshold_Pct) : undefined,
    Selling_Price: Number(r.Selling_Price) || 0,
    Yield: Number(r.Yield) || 1,
  };
}
function normalizeRIRow(r) {
  return {
    Recipe_ID: String(r.Recipe_ID ?? "").trim(),
    Ingredient_ID: String(r.Ingredient_ID ?? "").trim(),
    Quantity_Used: Number(r.Quantity_Used) || 0,
  };
}
