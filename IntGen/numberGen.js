const Bacon = require('baconjs');
const createPausableStream = require('bacon-pausable-stream');

/**
 * Creates a stream of randomly generated integers
 *
 * This function assumes that integerCount >= 0.
 * This function assumes that lowerBound <= upperBound.
 *
 * @param integerCount - The number of random integers to be generated.
 * @param lowerBound - The lower bound (inclusive) of the integer range
 * @param upperBound - The upper bound (inclusive) of the integer range
 * @returns A pausable stream of randomly-generated integers
 */
function createRandomIntegerStream(integerCount, lowerBound, upperBound) {
	//The generator function that generates the random integers
	function* generateRandomIntegers(integerCount, lowerBound, upperBound) {		
		let count = 0;
		
		while(count < integerCount) {
			//console.log("Generate: ", count);
			yield generateRandomInteger(lowerBound, upperBound);
			
			count++;
		}

		return new Bacon.End();
	}
	
	const stream = createPausableStream(generateRandomIntegers(integerCount,
		lowerBound, upperBound));
	
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