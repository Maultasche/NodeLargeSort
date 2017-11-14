const Bacon = require('baconjs');

/**
 * Creates a stream of randomly generated integers
 *
 * This function assumes that integerCount >= 0.
 * This function assumes that lowerBound <= upperBound.
 *
 * @param integerCount - The number of random integers to be generated.
 * @param lowerBound - The lower bound (inclusive) of the integer range
 * @param upperBound - The upper bound (inclusive) of the integer range
 * @returns A stream of randomly-generated integers
 */
function createRandomIntegerStream(integerCount, lowerBound, upperBound) {
	const stream = Bacon.repeat(currentIteration => {
		if(currentIteration < integerCount) {
			return Bacon.once(generateRandomInteger(lowerBound, upperBound));
		}
		else {
			return false;
		}
	});
	
	return stream;
}

/**
 * Generates a random integer between a lower bound (inclusive) 
 * and an upper bound (inclusive)
 *
 * @param lowerBound - The lower bound (inclusive) of the integer range
 * @param upperBound - The upper bound (inclusive) of the integer range
 * @returns A randomly generated integer within the specified range
 */
function generateRandomInteger(lowerBound, upperBound) {
	return Math.floor(Math.random() * (upperBound - lowerBound + 1) + lowerBound); 
}

const numberGen = {
	createRandomIntegerStream
};

module.exports = numberGen;