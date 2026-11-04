// ../../client/isEmpty.ts
function isEmpty(arr) {
	return arr === void 0 || arr.length === 0;
}
// src/play/play.ts
console.log("fixture client", isEmpty([]));
