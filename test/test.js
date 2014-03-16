var assert = require('chai').assert,
	PArray = require('..'),
	when = require('when'),
	delay = require('when/delay');

describe('should have own implementation', function () {
	Object.getOwnPropertyNames(Array.prototype)
	.filter(function (name) { return !(name in Object.prototype) })
	.forEach(function (name) {
		it('of ' + name, function () {
			assert.ok(PArray.prototype.hasOwnProperty(name));
		});
	});
});

describe('length', function () {
	it('for array', function () {
		return new PArray([1, 2, 3]).length.then(function (length) {
			assert.equal(length, 3);
		});
	});

	it('for promised array', function () {
		return new PArray(delay(1, [1, 2, 3])).length.then(function (length) {
			assert.equal(length, 3);
		});
	});
});