// Polyfill for Array.prototype.toReversed for Node versions that lack it (e.g., Node 18)
if (typeof Array.prototype.toReversed !== 'function') {
  Object.defineProperty(Array.prototype, 'toReversed', {
    configurable: true,
    writable: true,
    value: function toReversed() {
      return Array.prototype.slice.call(this).reverse();
    },
  });
}
