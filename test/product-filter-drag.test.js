const assert = require("assert");
const fs = require("fs");

const source = fs.readFileSync("pages/products/index.vue", "utf8");

assert.ok(source.includes("selectedCategoryIds"), "products page tracks selected categories");
assert.ok(source.includes("filteredProducts"), "products page exposes filtered products");
assert.ok(source.includes("v-menu"), "products page renders a category dropdown");
assert.ok(source.includes("v-checkbox"), "category dropdown uses checkboxes");
assert.ok(source.includes("Filtrer"), "filter button uses the requested label");
assert.ok(source.includes("product-filter-button"), "filter button uses a dedicated style");
assert.ok(source.includes("Gérer les catégories"), "category button uses manage label");
assert.ok(source.includes("'/categories'"), "category button routes to categories list");
assert.ok(source.includes("draggable=\"true\""), "product rows are draggable");
assert.ok(source.includes("@dragstart=\"startProductDrag"), "drag start is wired");
assert.ok(source.includes("@drop=\"dropProduct"), "drop is wired");
assert.ok(source.includes("moveVisibleProduct"), "filtered reorder helper is present");
