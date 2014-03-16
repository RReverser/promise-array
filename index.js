var when = require('when'),
	Filtered = Object.create(null),
	FilteredPromise = when.reject(Filtered);

function PromiseArray(array) {
	Object.defineProperty(this, '_array', {value: array});
}

require('util').inherits(PromiseArray, Array);

Object.defineProperty(PromiseArray, 'Filtered', {value: Filtered});

function rejectModify() {
	return when.reject(new Error('Modifying Promise array is not allowed, use concat() / slice() instead.'));
}

function FoundItem(index) {
	this.index = index;
}

var proto = {
	withArray: function (func) {
		return when(this._array, func);
	},

	whenAll: function () {
		return when.settle(this._array).then(function (descriptors) {
			var newDescriptors = [];

			for (var i in descriptors) {
				var descriptor = descriptors[i];

				if (descriptor.state === 'rejected') {
					if (descriptor.reason !== Filtered) {
						return when.reject(descriptor.reason);
					}
				} else {
					newDescriptors.push(descriptor.value);
				}
			}

			return newDescriptors;
		});
	},

	push: rejectModify,
	pop: rejectModify,
	shift: rejectModify,
	unshift: rejectModify,
	splice: rejectModify,

	concat: function () {
		return when.all([this._array, when.all(arguments)]).then(function (arrays) {
			return arrays.concat.apply(arrays[0], arrays[1]);
		});
	},
	
	slice: function () {
		var args = arguments;

		return this.withArray(function (array) {
			return array.slice.apply(array, args);
		});
	},

	forEach: function (func, context) {
		this.map(func, context);
	},

	map: function (func, context) {
		return new PromiseArray(this.withArray(function (array) {
			return array.map(function (value) {
				var context = this, args = arguments;

				return when(value, function (value) {
					args[0] = value;
					return func.apply(context, args);
				});
			}, context);
		}));
	},

	filter: function (filter, context) {
		return this.map(function (value) {
			return filter.apply(this, arguments) ? value : FilteredPromise;
		}, context);
	},

	some: function (filter, context) {
		return when.any(this.filter(filter, context)._array).then(
			function () { return true },
			function () { return false }
		);
	},

	every: function (filter, context) {
		return this.some(function () {
			return !filter.apply(this, arguments);
		}, context).then(function (someDoesNotMatch) {
			return !someDoesNotMatch;
		});
	},

	anyIndexOf: function (searchValue, fromIndex) {
		if (fromIndex < 0) {
			fromIndex += this.length;

			if (fromIndex < 0) {
				fromIndex = 0;
			}
		}

		var index = -1;

		return this.slice(fromIndex).some(function (value, currentIndex) {
			if (value === searchValue) {
				index = currentIndex;
				return true;
			} else {
				return false;
			}
		}).then(function () {
			return index;
		});
	},

	reduce: function (func, initialValue) {
		var args = arguments;

		return this.withArray(function (array) {
			var outArgs = [array, function (value, index, total) {
				total = array;
				return func.apply(this, arguments);
			}];

			if (arguments.length > 1) {
				outArgs.push(initialValue);
			}

			return when.reduce.apply(null, outArgs);
		});
	},

	reduceRight: function (func, initialValue) {
		var args = arguments;

		return this.withArray(function (array) {
			var outArgs = [array.reverse(), function (value, index, total) {
				index = array.length - 1 - index;
				total = array;
				return func.apply(this, arguments);
			}];

			if (arguments.length > 1) {
				outArgs.push(initialValue);
			}

			return when.reduce.apply(null, outArgs);
		});
	},

	indexOf: function (searchValue, fromIndex) {
		return this.slice(fromIndex).reduce(function (searchValue, value, index) {
			return value === searchValue ? when.reject(new FoundItem(index)) : searchValue;
		}, searchValue).then(function () {
			return -1;
		}, function (foundItem) {
			if (foundItem instanceof FoundItem) {
				return foundItem.index;
			}
		});
	},

	lastIndexOf: function (searchValue, fromIndex) {
		return this.slice(fromIndex).reduceRight(function (searchValue, value, index) {
			return value === searchValue ? when.reject(new FoundItem(index)) : searchValue;
		}, searchValue).then(function () {
			return -1;
		}, function (foundItem) {
			if (foundItem instanceof FoundItem) {
				return foundItem.index;
			}
		});
	},

	join: function () {
		var args = arguments;

		return this.whenAll().then(function (array) {
			return array.join.apply(array, args);
		})
	},

	sort: function () {
		var args = arguments;

		return this.whenAll().then(function (values) {
			return values.sort.apply(values, args);
		});
	},

	reverse: function () {
		return new PromiseArray(this.whenAll().then(function (values) {
			return values.reverse();
		}));
	}
};

Object.defineProperty(PromiseArray.prototype, 'length', {
	get: function () {
		return this.withArray(function (array) {
			return array.length;
		});
	}
})

for (var methodName in proto) {
	Object.defineProperty(PromiseArray.prototype, methodName, {value: proto[methodName]});
}

module.exports = PromiseArray;