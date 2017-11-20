const fs = require('fs');
const fileIO = require('../../IntSort/fileIO');
const streamify = require('stream-array');
const _ = require('lodash');

//Mock the fs module
jest.mock('fs', () => ({ statAsync: jest.fn() }));

//Reset the mock functions before each test
beforeEach(() => {
	jest.clearAllMocks();
});

//Test the fileExists function
describe('testing detecting whether a file exists', () => {
	test('indicates that a file exists when it does exist', () => {
		//Mock the fs.statAsync function to indicate that a file exists
		fs.statAsync.mockReturnValueOnce(Promise.resolve({
			isFile: () => true
		}));
		
		//Find out whether a file exists
		return expect(fileIO.fileExists('testfile.txt')).resolves.toBe(true);
	});
	
	test('indicates that a file does exist when it is a directory', () => {
		//Mock the fs.statAsync function to indicate that a file exists
		fs.statAsync.mockReturnValueOnce(Promise.resolve({
			isFile: () => false,
			isDirectory: () => true
		}));
		
		//Find out whether a file exists
		return expect(fileIO.fileExists('testfile.txt')).resolves.toBe(false);
	});
	
	test('indicates that a file does exist when there is nothing ' + 
		'with that file name', () => {
		//Mock the fs.statAsync function to indicate that a file exists
		fs.statAsync.mockReturnValueOnce(Promise.reject(new Error('does not exist')));
		
		//Find out whether a file exists
		return expect(fileIO.fileExists('testfile.txt')).resolves.toBe(false);
	});
});

describe('testing the creation of an integer chunk stream', () => {
	test('correctly chunks data divisible by the chunk size', () => {
		const testData = createRandomStringIntegerArray(10)
			.map(integer => integer.toString() + '\n');
			
		return testChunkStreamWithData(testData, 2);
	});
	
	test('correctly chunks data that is not divisible by the chunk size', () => {
		const testData = createRandomStringIntegerArray(12)
			.map(integer => integer.toString() + '\n');
			
		return testChunkStreamWithData(testData, 5);
	});
	
	test('correctly chunks empty data', () => {
		const testData = [];
			
		return testChunkStreamWithData(testData, 5);
	});
	
	test('correctly chunks data containing a single integer', () => {
		const testData = [8].map(integer => integer.toString() + '\n');
			
		return testChunkStreamWithData(testData, 5);
	});
	
	test('correctly chunks data with multiple integers, but smaller than the chunk size', 
	() => {
		const testData = createRandomStringIntegerArray(6)
			.map(integer => integer.toString() + '\n');
			
		return testChunkStreamWithData(testData, 10);
	});
	
	test('correctly chunks data when the chunk size is 1', () => {
		const testData = createRandomStringIntegerArray(12)
			.map(integer => integer.toString() + '\n');
			
		return testChunkStreamWithData(testData, 1);
	});
	
	test('correctly chunks data when the chunk size is the same as the data', () => {
		const testData = createRandomStringIntegerArray(10)
			.map(integer => integer.toString() + '\n');
			
		return testChunkStreamWithData(testData, 10);
	});
	
	/**
	 * Tests the chunk stream with a particular set of test data
	 *
	 * @param data - an array of integers to serve as the test data
	 * @param chunkSize - the number of integers that is contained in a chunk
	 */
	function testChunkStreamWithData(data, chunkSize) {
		//We have to wrap all this in a promise so that the test runner
		//will wait until the asynchronous code has had a chance to complete
		return new Promise((resolve, reject) => {
			//Create a Node.js read stream with the test data
			const readStream = streamify(data);
			
			//Handle any read stream errors
			readStream.on('error', error => reject(error));
			
			//Calculate the expected chunks
			const expectedChunks = calculateChunks(data, chunkSize);
			
			//Create the integer chunk stream
			const stream = fileIO.createIntegerChunkStream(readStream, chunkSize);
			
			//Handle any integer stream errors
			stream.onError(error => reject(error));
			
			//Read the chunks from the integer chunk stream
			const actualChunks = [];
			
			stream.onValue(chunk => actualChunks.push(chunk));
			
			//When the stream ends, compare the actual chunks with the expected chunks
			stream.onEnd(() => {
				//Verify that we have the same number of chunks
				expect(actualChunks.length).toBe(expectedChunks.length);
				
				//Compare the chunks to verify that they are the same
				_.zip(expectedChunks, actualChunks)
					.forEach(chunkPair => {
						compareChunks(chunkPair[0], chunkPair[1]);
					});
					
				resolve();
			});			
		});

	}
	
	/**
	 * Compares two chunks and verifies that they contain the same values
	 *
	 * @param expectedChunk - an array containing the expected chunk data
	 * @param actualChunk - an array containing the actual chunk data
	 */
	function compareChunks(expectedChunk, actualChunk) {
		_.zip(expectedChunk, actualChunk)
			.forEach(integerPair => expect(integerPair[0]).toBe(integerPair[1]));
	}
	
	/**
	 * Calculates the expected chunks for a particular set of test data
	 *
	 * @param data - an array of integers to serve as the test data
	 * @returns an array containing the expected chunks, where each chunk
	 *	is an array of integers
	 */
	function calculateChunks(data, chunkSize) {
		const chunks = data.reduce((currentChunks, value, index) => {
			//Calculate the current chunk index
			const chunkIndex = Math.floor(index / chunkSize);
			
			//Create the current chunk array if it doesn't exist
			if(currentChunks.length - 1 < chunkIndex) {
				currentChunks[chunkIndex] = [];
			}
			
			//Add the current value to the current chunk
			//We're converting the value to an integer because the actual chunks
			//will also be integers
			currentChunks[chunkIndex].push(parseInt(value));
			
			return currentChunks;
		}, []);
		
		return chunks;
	}
});

/**
 * Creates an array of random integers between -100 and 100
 *
 * @param length - the size of the array to be created
 * @returns an array of randomly generated integers
 */
function createRandomStringIntegerArray(length) {
	const lowerBound = -100;
	const upperBound = 100;
	
	const array = _.range(length)
		.map(() => generateRandomInteger(lowerBound, upperBound));
		
	return array;
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

//Test reading from data that is divisible by the chunk size
//Test reading from data that is not divisible by the chunk size and has a chunk
//at the end that is not the same size as the others
//Test reading from empty data
//Test reading from data that is smaller than a single chunk
//Test reading from data that has just one integer

//Ensure that the correct number of chunks are emitted
//Ensure that each chunk is the expected size