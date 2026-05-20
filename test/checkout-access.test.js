const assert = require("assert");
const { isQrClientAccess } = require("../helpers/checkoutAccess");

assert.strictEqual(isQrClientAccess(2), true);
assert.strictEqual(isQrClientAccess("2"), true);
assert.strictEqual(isQrClientAccess(3), true);
assert.strictEqual(isQrClientAccess("3"), true);
assert.strictEqual(isQrClientAccess(0), false);
assert.strictEqual(isQrClientAccess(1), false);
assert.strictEqual(isQrClientAccess(null), false);

console.log("checkoutAccess tests passed");
