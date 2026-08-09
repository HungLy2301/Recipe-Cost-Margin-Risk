import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // IMPORTANT: this must match your repository name, with slashes on both sides.
  // Your site will live at https://USERNAME.github.io/recipe-cost-margin-risk/
  // and without this line every file would be looked for in the wrong place,
  // producing a blank white page.
  base: "/recipe-cost-margin-risk/",
});
