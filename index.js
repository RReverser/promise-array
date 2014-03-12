var Promise = global.Promise || require('es6-promise').Promise,
	asPromise = Promise.cast.bind(Promise),
	FILTERED = Object.create(null),
	AP = Array.prototype;

function asPromises(array) {
	return AP.map.call(array, asPromise);
}

function FoundItem(index) {
	this.index = index;
}

function PromiseArray(array) {
	this.push.apply(this, array);
}

require('util').inherits(PromiseArray, Array);

Object.defineProperty(PromiseArray, 'Promise', {
	enumerable: true,
	value: Promise
});

Object.defineProperties(PromiseArray.prototype, {
	toArray: {
		value: function () {
			return AP.slice.call(this);
		}
	},

	then: {
		value: function (resolve, reject) {
			return Promise.all(this.toArray()).then(function (values) {
				return values.filter(function (value) {
					return value !== FILTERED;
				});
			}).then(resolve, reject);
		}
	},

	push: {
		value: function () {
			return AP.push.apply(this, asPromises(arguments));
		}
	},
	concat: {
		value: function () {
			return new PromiseArray(AP.concat.apply(this.toArray(), arguments));
		}
	},
	unshift: {
		value: function () {
			return AP.unshift.apply(this, asPromises(arguments));
		}
	},
	slice: {
		value: function () {
			return new PromiseArray(AP.slice.apply(this, arguments));
		}
	},
	splice: {
		value: function () {
			return new PromiseArray(AP.splice.apply(this, arguments));
		}
	},

	forEach: {
		value: function (func, context) {
			AP.forEach.call(this, function (promise) {
				var args = arguments;

				promise.then(function (value) {
					args[0] = value;
					func.apply(this, args);
				}.bind(this));
			});
		}
	},
	map: {
		value: function (func, context) {
			return new PromiseArray(AP.map.call(this, function (promise) {
				var args = arguments;

				return promise.then(function (value) {
					args[0] = value;
					return func.apply(this, args);
				}.bind(this));
			}, context));
		}
	},
	filter: {
		value: function (filter, context) {
			return this.map(function (value) {
				return filter.apply(this, arguments) ? value : FILTERED;
			}, context);
		}
	},
	some: {
		value: function (filter, context) {
			return new Promise(function (resolve, reject) {
				this.forEach(function () {
					if (filter.apply(this, arguments)) {
						resolve(true);
					}
				}, context);

				this.then(function () { resolve(false) }, reject);
			}.bind(this));
		}
	},
	every: {
		value: function (filter, context) {
			return this.some(function () {
				return !filter.apply(this, arguments);
			}, context).then(function (someDoesNotMatch) {
				return !someDoesNotMatch;
			});
		}
	},
	indexOf: {
		value: function (searchValue, fromIndex) {
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
		}
	},
	reduce: {
		value: function (func, initialValue) {
			return AP.reduce.apply(this, [function (prevPromise, promise) {
				var args =  arguments;

				return Promise.all([prevPromise, promise]).then(function (values) {
					args[0] = values[0];
					args[1] = values[1];
					return func.apply(this, args);
				});
			}].concat(arguments.length > 1 ? [asPromise(initialValue)] : []));
		}
	},
	reduceRight: {
		value: function (func, initialValue) {
			return AP.reduceRight.apply(this, [function (prevPromise, promise) {
				var args =  arguments;

				return Promise.all([prevPromise, promise]).then(function (values) {
					args[0] = values[0];
					args[1] = values[1];
					return func.apply(this, args);
				});
			}].concat(arguments.length > 1 ? [asPromise(initialValue)] : []));
		}
	},
	firstIndexOf: {
		value: function (searchValue, fromIndex) {
			return this.slice(fromIndex).reduce(function (searchValue, value, index) {
				return value === searchValue ? Promise.reject(new FoundItem(index)) : searchValue;
			}, searchValue).then(function () {
				return -1;
			}, function (foundItem) {
				if (foundItem instanceof FoundItem) {
					return foundItem.index;
				}
			});
		}
	},
	lastIndexOf: {
		value: function (searchValue, fromIndex) {
			return this.slice(fromIndex).reduceRight(function (searchValue, value, index) {
				return value === searchValue ? Promise.reject(new FoundItem(index)) : searchValue;
			}, searchValue).then(function () {
				return -1;
			}, function (foundItem) {
				if (foundItem instanceof FoundItem) {
					return foundItem.index;
				}
			});
		}
	},
	join: {
		value: function (delimiter) {
			if (delimiter === undefined) {
				delimiter = ',';
			}

			return this.reduce(function (prevValue, value) {
				return prevValue + delimiter + value;
			});
		}
	},
	sort: {
		value: function () {
			var args = arguments;

			return this.then(function (values) {
				return AP.sort.apply(values, args);
			});
		}
	}
});

module.exports = PromiseArray;