const assert = require("assert");
const fs = require("fs");

const read = (file) => fs.readFileSync(file, "utf8");

const productsPage = read("pages/products/index.vue");
const categoriesPage = read("pages/categories/index.vue");
const tablesPage = read("pages/tables/index.vue");
const productsStore = read("store/products.js");
const categoriesStore = read("store/categories.js");
const tablesStore = read("store/tables.js");

assert.ok(productsPage.includes("moveProduct"), "products page exposes move controls");
assert.ok(categoriesPage.includes("moveCategory"), "categories page exposes move controls");
assert.ok(tablesPage.includes("moveTable"), "tables page exposes move controls");

[productsPage, categoriesPage, tablesPage].forEach((source) => {
  assert.ok(source.includes("mdi-arrow-up"), "up icon is rendered");
  assert.ok(source.includes("mdi-arrow-down"), "down icon is rendered");
});

assert.ok(productsStore.includes("reorderProducts"), "products store has reorder action");
assert.ok(categoriesStore.includes("reorderCategories"), "categories store has reorder action");
assert.ok(tablesStore.includes("reorderTables"), "tables store has reorder action");
