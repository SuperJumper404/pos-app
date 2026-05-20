const assert = require("assert");
const {
  appendOrderSentEntry,
  filterTodayOrderEntries,
  getOrderIds,
} = require("../helpers/ordersSent");

const now = new Date("2026-05-20T10:00:00.000Z").getTime();
const yesterday = new Date("2026-05-19T10:00:00.000Z").getTime();

assert.deepStrictEqual(
  filterTodayOrderEntries(
    [
      { insertId: 11, date: now },
      { insertId: 10, date: yesterday },
    ],
    now,
  ),
  [{ insertId: 11, date: now }],
);

assert.deepStrictEqual(appendOrderSentEntry([], 42, now), [
  { insertId: 42, date: now },
]);

assert.deepStrictEqual(
  appendOrderSentEntry([{ insertId: 42, date: now }], 42, now + 1),
  [{ insertId: 42, date: now }],
);

assert.deepStrictEqual(
  getOrderIds([
    { insertId: 42, date: now },
    { insertId: "43", date: now },
  ]),
  [42, "43"],
);

console.log("ordersSent tests passed");
