const Bacon = require('baconjs');
const numberGen = require('../../IntGen/numberGen');

describe('testing the creation of a random integer stream', () => {
	describe('testing the integer count parameter', () => {
		//Test with increasing numbers of integers
		createRandomIntegerStreamTest(0, 1, 10);
		createRandomIntegerStreamTest(1, 1, 10);
		createRandomIntegerStreamTest(10, 1, 10);
		createRandomIntegerStreamTest(100, 1, 10);
		createRandomIntegerStreamTest(1000, 1, 10);
		createRandomIntegerStreamTest(10000, 1, 10);
	});
	
	describe('testing the bounds parameters', () => {
		// Test with positive bounds
		createRandomIntegerStreamTest(1000, 5, 27);
		createRandomIntegerStreamTest(1000, 10, 100);
		createRandomIntegerStreamTest(1000, 443, 3423453);
		
		// Test with negative bounds
		createRandomIntegerStreamTest(1000, -10, -1);
		createRandomIntegerStreamTest(1000, -50, -8);
		createRandomIntegerStreamTest(1000, -100, -90);
		createRandomIntegerStreamTest(1000, -3000, -1223);
		createRandomIntegerStreamTest(1000, -324324, -22);
		
		// Test with bounds that include both positive and negative numbers
		createRandomIntegerStreamTest(1000, -2, 2);
		createRandomIntegerStreamTest(1000, -1, 0);
		createRandomIntegerStreamTest(1000, -100, 10);
		createRandomIntegerStreamTest(1000, -32423, 8564);
		
		// Test with bounds where the lower bound equals the upper bound
		createRandomIntegerStreamTest(1000, 1, 1);
		createRandomIntegerStreamTest(1000, 0, 0);
		createRandomIntegerStreamTest(1000, 20, 20);
		createRandomIntegerStreamTest(1000, -34, -34);
	});
	
	test('the random integer stream can be paused and resumed', () => {
		return new Promise((resolve, reject) => {
			const integerCount = 10;
			const lowerBound = 1;
			const upperBound = 100;
			
			//Create the random integer stream
			const randomIntegerStream = numberGen.createRandomIntegerStream(integerCount, 
				lowerBound, upperBound);
				
			//Test the random integer stream
			let emittedIntegerCount = 0;
			let pausePoint = Math.ceil(integerCount * 0.75);
			
			randomIntegerStream.onError(error => reject(error));
			
			randomIntegerStream.onValue(value => {
				//Verify that the value is a number
				expect(typeof value).toBe("number");
				
				//Verify that the value is an integer
				expect(Math.floor(value)).toBe(value);
				
				//Verify that the value is within the bounds
				expect(value).toBeGreaterThanOrEqual(lowerBound);
				expect(value).toBeLessThanOrEqual(upperBound);

				emittedIntegerCount++;
				
				//If we are at the pause point, pause the stream
				if(emittedIntegerCount === pausePoint) {
					const currentEmittedIntegerCount = emittedIntegerCount;
					
					randomIntegerStream.pause();
					
					//Set a timeout function to verify that no more integers were
					//emitted
					setTimeout(() => {
						expect(emittedIntegerCount).toBe(currentEmittedIntegerCount);
						
						//Resume the stream
						randomIntegerStream.resume();
					}, 10);
				}
			});

			randomIntegerStream.onEnd(() => {
				//When the random integer stream ends, verify that the expected number
				//of integers were emitted and resolve the test promise
				expect(emittedIntegerCount).toBe(integerCount);
				
				resolve();
			});
		});
	});
});

/**
 * Creates a random integer stream unit test based on parameters
 *
 * @param expectedCount - The number of integers in the stream to be tested
 * @param lowerBound - The lower bound (inclusive) of the generated integers
 * @param upperBound - The upper bound (inclusive) of the generated integers
 */
function createRandomIntegerStreamTest(expectedCount, lowerBound, upperBound) {
	test(`generating ${expectedCount} integers in range (${lowerBound}, ${upperBound})`, 
	() => {	
		const randomIntegerStream = numberGen.createRandomIntegerStream(expectedCount, 
			lowerBound, upperBound);
			
		testRandomIntegerStream(randomIntegerStream, expectedCount, lowerBound,
			upperBound);
	});
}

/**
 * Performs the testing of a random integer stream
 *
 * @param randomIntegerStream - The stream to be tested
 * @param expectedCount - The number of integers we are expecting from the stream
 * @param lowerBound - The lower bound (inclusive) of the generated integers
 * @param upperBound - The upper bound (inclusive) of the generated integers
 */
function testRandomIntegerStream(randomIntegerStream, expectedCount, lowerBound, upperBound) {
	//Keep track of the number of integers that are generated
	let actualCount = randomIntegerStream.reduce(0, (currentCount, value) => {
		//Verify that the value is a number
		expect(typeof value).toBe("number");
		
		//Verify that the value is an integer
		expect(Math.floor(value)).toBe(value);
		
		//Verify that the value is within the bounds
		expect(value).toBeGreaterThanOrEqual(lowerBound);
		expect(value).toBeLessThanOrEqual(upperBound);
		
		return currentCount + 1;
	});
	
	//Verify that the count is correct
	actualCount.onValue(count => expect(count).toBe(expectedCount));
}