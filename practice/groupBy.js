// GroupBy polyfill — node practice/groupBy.js

function groupBy(items, fn) {
  const out = Object.create(null);
  let i = 0;
  for (const item of items) {
    const key = String(fn(item, i++));
    if (!out[key]) out[key] = [];
    out[key].push(item);
  }
  return out;
}

if (!Object.groupBy) {
  Object.groupBy = groupBy;
}

if (!Array.prototype.groupBy) {
  Array.prototype.groupBy = function (fn) {
    return groupBy(this, fn);
  };
}

const users = [
  { name: 'A', role: 'admin' },
  { name: 'B', role: 'user' },
  { name: 'C', role: 'admin' },
];

console.log(groupBy(users, (u) => u.role));
console.log([1, 2, 3, 4].groupBy((n) => (n % 2 ? 'odd' : 'even')));
