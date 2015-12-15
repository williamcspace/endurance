'use strict';
var merge = function (left, right, comparison) {
  var result = [];
  var leftLength = left.length;
  var rightLength = right.length;

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
};

var merge_sort = function (array, comparison) {
  if (array.length < 2) {
    return array;
  }
  var middle = Math.ceil(array.length / 2);
  var left = array.slice(0, middle);
  var right = array.slice(middle);
  return merge(merge_sort(left, comparison), merge_sort(right, comparison), comparison);
};

module.exports = merge_sort;
