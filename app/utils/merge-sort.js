'use strict';
function _merge(left, right, comparison) {
  const result = [];

  while ((left.length > 0) && (right.length > 0)) {
    if (comparison(left[0], right[0]) <= 0) {
      result.push(left.shift());
    } else {
      result.push(right.shift());
    }
  }

  while (left.length > 0) {
    result.push(left.shift());
  }

  while (right.length > 0) {
    result.push(right.shift());
  }

  return result;
}

function mergeSort(array, comparison) {
  if (array.length < 2) {
    return array;
  }

  const middle = Math.ceil(array.length / 2);
  const left = array.slice(0, middle);
  const right = array.slice(middle);
  return _merge(mergeSort(left, comparison), mergeSort(right, comparison), comparison);
}

module.exports = mergeSort;
