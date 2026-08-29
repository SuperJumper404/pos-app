const assert = require("assert");
const fs = require("fs");

const index = fs.readFileSync("pages/categories/index.vue", "utf8");
const create = fs.readFileSync("pages/categories/newcategory.vue", "utf8");
const edit = fs.readFileSync("pages/categories/edit/_id.vue", "utf8");
const store = fs.readFileSync("store/categories.js", "utf8");
const products = fs.readFileSync("pages/products/index.vue", "utf8");

assert.ok(index.includes("v-avatar"), "categories list shows avatars");
assert.ok(create.includes("v-file-input"), "category creation accepts an image");
assert.ok(edit.includes("v-file-input"), "category edit accepts an image");
assert.ok(store.includes("FormData"), "category store sends multipart data");
assert.ok(products.includes("categoryImageSrc"), "product filter can render category images");
