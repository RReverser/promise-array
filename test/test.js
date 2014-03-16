var assert = require('chai').assert,
	PArray = require('..'),
	when = require('when'),
	delay = require('when/delay');

describe('has own implementation', function () {
	Object.getOwnPropertyNames(Array.prototype)
	.filter(function (name) { return !(name in Object.prototype) })
	.forEach(function (name) {
		it('of ' + name, function () {
			assert.ok(PArray.prototype.hasOwnProperty(name));
		});
	});
});

describe('rejects modifying methods', function () {
	var a = new PArray([1, 2, 3]);

	function assertReject(promise) {
		return promise.then(
			function () { assert.ok(false) },
			function () { assert.ok(true) }
		);
	}

	it('push', function () {
		return assertReject(a.push(4));
	});

	it('pop', function () {
		return assertReject(a.pop());
	});

	it('push', function () {
		return assertReject(a.shift());
	});

	it('unshift', function () {
		return assertReject(a.unshift(0));
	});

	it('splice', function () {
		return when.all([
			assertReject(a.splice(0, 1)),
			assertReject(a.splice(1, 1, 10))
		]);
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