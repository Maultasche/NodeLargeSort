const streamify = require('stream-array');
const _ = require('lodash');

//Ensure that the necessary functions from the common fileIO module are provided
describe('ensuring that the necessary functions from the common fileIO ' + 
	'module are provided', () => {
	jest.resetModules();
	
	const commonFileIO = require('../../common/fileIO');
	const fileIO = require('../../IntSort/fileIO');	
	
	//Verify that the common createWriteableFileStream() function is provided
	test('the common createWriteableFileStream() function is provided', () => {
		expect(fileIO.createWriteableFileStream)
			.toBe(commonFileIO.createWriteableFileStream);
	});
	
	//Verify that the common ensureDirectoryExists() function is provided
	test('the common ensureDirectoryExists() function is provided', () => {
		expect(fileIO.ensureDirectoryExists)
			.toBe(commonFileIO.ensureDirectoryExists);
	});
	
	//Verify that the common ensureFilePathExists() function is provided
	test('the common ensureFilePathExists() function is provided', () => {
		expect(fileIO.ensureFilePathExists)
			.toBe(commonFileIO.ensureFilePathExists);
	});
});

//Test the fileExists function
describe('testing detecting whether a file exists', () => {
	jest.resetModules();
	
	//Mock the fs module
	jest.doMock('fs', () => ({ statAsync: jest.fn() }));
	
	const fs = require('fs');
	const fileIO = require('../../IntSort/fileIO');
	
	//Reset the mock functions before each test
	beforeEach(() => {
		jest.clearAllMocks();
	});
	
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
	jest.resetModules();
	
	const fileIO = require('../../IntSort/fileIO');
	
	test('correctly chunks data divisible by the chunk size', () => {
		const testData = createRandomIntegerArray(10)
			.map(integer => integer.toString() + '\n');
			
		return testChunkStreamWithData(testData, 2);
	});
	
	test('correctly chunks data that is not divisible by the chunk size', () => {
		const testData = createRandomIntegerArray(12)
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
		const testData = createRandomIntegerArray(6)
			.map(integer => integer.toString() + '\n');
			
		return testChunkStreamWithData(testData, 10);
	});
	
	test('correctly chunks data when the chunk size is 1', () => {
		const testData = createRandomIntegerArray(12)
			.map(integer => integer.toString() + '\n');
			
		return testChunkStreamWithData(testData, 1);
	});
	
	test('correctly chunks data when the chunk size is the same as the data', () => {
		const testData = createRandomIntegerArray(10)
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

describe('testing the creation of an integer stream', () => {
	jest.resetModules();
	
	const fileIO = require('../../IntSort/fileIO');
	
	test('correctly reads an integer stream', () => {
		const testData = createRandomIntegerArray(10)
			.map(integer => integer.toString() + '\n');
			
		return testIntegerStreamWithData(testData);
	});
	
	test('correctly reads empty data', () => {
		const testData = [];
			
		return testIntegerStreamWithData(testData);
	});
	
	test('correctly reads data containing a single integer', () => {
		const testData = [8].map(integer => integer.toString() + '\n');
			
		return testIntegerStreamWithData(testData);
	});
	
	/**
	 * Tests the integer stream with a particular set of test data
	 *
	 * @param data - an array of integers to serve as the test data
	 */
	function testIntegerStreamWithData(data) {
		//We have to wrap all this in a promise so that the test runner
		//will wait until the asynchronous code has had a chance to complete
		return new Promise((resolve, reject) => {
			//Create a Node.js read stream with the test data
			const readStream = streamify(data);
			
			//Handle any read stream errors
			readStream.on('error', error => reject(error));
			
			//Create the integer stream
			const stream = fileIO.createIntegerStream(readStream);
			
			//Handle any integer stream errors
			stream.onError(error => reject(error));
			
			//Read the integers from the integer stream
			const expectedIntegers = data.map(integerString => parseInt(integerString));
			const actualIntegers = [];
			
			stream.onValue(integer => actualIntegers.push(integer));
			
			//When the stream ends, compare the actual integers with the expected integers
			stream.onEnd(() => {
				//Verify that we have the same number of integers
				expect(actualIntegers.length).toBe(expectedIntegers.length);
				
				//Compare the integers to verify that they are the same
				_.zip(expectedIntegers, actualIntegers)
					.forEach(integerPair => expect(integerPair[0]).toBe(integerPair[1]));
					
				resolve();
			});			
		});

	}
});

describe('testing writing a chunk to a file', () => {
	jest.resetModules();
	
	const fs = require('fs');
	const fileIO = require('../../IntSort/fileIO');

	//Mock some functions in the fileIO module
	fileIO.ensureFilePathExists = jest.fn();
	fileIO.createWriteableFileStream = jest.fn();
	
	//Reset the mock functions before each test
	beforeEach(() => {
		jest.clearAllMocks();
	});

	const testFileName = 'testFile.txt';
	
	//Test writing a chunk with multiple integers
	test('chunk with multiple integers is written to a file', () => {
		//Mock fileIO.ensureFilePathExists to be successful
		fileIO.ensureFilePathExists.mockReturnValueOnce(Promise.resolve());
				
		//Mock fileIO.createWriteableFileStream to return a mock writeable stream
		const writtenData = [];
		
		const mockWriteableStream = {
			closeHandler: null,
			once: jest.fn(),
			on: jest.fn(),
			once: jest.fn(),
			end: jest.fn(),
			write: line => writtenData.push(parseInt(line))
		};
		
		//Mock the writeable stream to keep track of the close handler
		mockWriteableStream.once.mockImplementation((eventString, handler) => {
			if(eventString === 'close') {
				mockWriteableStream.closeHandler = handler;
			}
		});
		
		//Mock the writeable stream so that calling the end() function calls the
		//'close' event handler
		mockWriteableStream.end.mockImplementation(() => {
			if(mockWriteableStream.closeHandler !== null) {
				mockWriteableStream.closeHandler();
			}
		});
		
		fileIO.createWriteableFileStream.mockReturnValueOnce(mockWriteableStream);
		
		//Create a chunk and write it to a file
		const testChunk = [4, 5, -4, 23, 12, 8, -11, 82];
		
		return expect(fileIO.writeChunkToFile(testChunk, testFileName)).resolves
			.not.toBeDefined().then(() => {
			//Verify that the correct chunk data was written
			_.zip(testChunk, writtenData)
				.forEach(dataPair => expect(dataPair[1]).toBe(dataPair[0]));
			
			//Verify that ensureFilePathExists was called with the correct file name
			expect(fileIO.ensureFilePathExists).toHaveBeenCalledTimes(1);
			expect(fileIO.ensureFilePathExists).toHaveBeenCalledWith(testFileName);
			
			//Verify that createWriteableFileStream was called with the correct file name
			expect(fileIO.createWriteableFileStream).toHaveBeenCalledTimes(1);
			expect(fileIO.createWriteableFileStream).toHaveBeenCalledWith(testFileName);
			
			//Verify that the end() function was called on our mock writeable stream
			expect(fileIO.createWriteableFileStream).toHaveBeenCalledTimes(1);
			expect(fileIO.createWriteableFileStream).toHaveBeenCalledWith(testFileName);
		});
	});
	
	//Test writing an empty chunk
	test('empty chunk is written to a file', () => {
		//Mock fileIO.ensureFilePathExists to be successful
		fileIO.ensureFilePathExists.mockReturnValueOnce(Promise.resolve());
				
		//Mock fileIO.createWriteableFileStream to return a mock writeable stream
		const writtenData = [];
		
		const mockWriteableStream = {
			closeHandler: null,
			on: jest.fn(),
			once: jest.fn(),
			end: jest.fn(),
			write: line => writtenData.push(parseInt(line))
		};
		
		//Mock the writeable stream to keep track of the close handler
		mockWriteableStream.once.mockImplementation((eventString, handler) => {
			if(eventString === 'close') {
				mockWriteableStream.closeHandler = handler;
			}
		});
		
		//Mock the writeable stream so that calling the end() function calls the
		//'close' event handler
		mockWriteableStream.end.mockImplementation(() => {
			if(mockWriteableStream.closeHandler !== null) {
				mockWriteableStream.closeHandler();
			}
		});
		
		fileIO.createWriteableFileStream.mockReturnValueOnce(mockWriteableStream);
		
		//Create a chunk and write it to a file
		const testChunk = [];
		
		return expect(fileIO.writeChunkToFile(testChunk, testFileName)).resolves
			.not.toBeDefined().then(() => {
				//Verify that no chunk data was written
				expect(writtenData.length).toBe(0);
				
				//Verify that ensureFilePathExists was called with the correct file name
				expect(fileIO.ensureFilePathExists).toHaveBeenCalledTimes(1);
				expect(fileIO.ensureFilePathExists).toHaveBeenCalledWith(testFileName);
				
				//Verify that createWriteableFileStream was called with the correct file name
				expect(fileIO.createWriteableFileStream).toHaveBeenCalledTimes(1);
				expect(fileIO.createWriteableFileStream).toHaveBeenCalledWith(testFileName);
				
				//Verify that the end() function was called on our mock writeable stream
				expect(fileIO.createWriteableFileStream).toHaveBeenCalledTimes(1);
				expect(fileIO.createWriteableFileStream).toHaveBeenCalledWith(testFileName);
			});
	});
	
	//Test writing a chunk when the writeable filestream emits an error	
	test('chunk is written to a file when a file stream error occurs', () => {
		//Mock fileIO.ensureFilePathExists to be successful
		fileIO.ensureFilePathExists.mockReturnValueOnce(Promise.resolve());
				
		//Mock fileIO.createWriteableFileStream to return a mock writeable stream
		const writtenData = [];
		let errorHandler = null;
		const errorMessage = "test error";
		
		//Mock the write function to generate an error
		const mockWriteableStream = {
			on: (eventName, handler) => {
				if(eventName === 'error') {
					errorHandler = handler;
				}
			},
			once: jest.fn(),
			end: jest.fn(),
			write: line => errorHandler(errorMessage)
		};
		
		fileIO.createWriteableFileStream.mockReturnValueOnce(mockWriteableStream);
		
		//Create a chunk and write it to a file
		const testChunk = [4, 5, -4, 23, 12, 8, -11, 82];
				
		expect.hasAssertions();
		
		return expect(fileIO.writeChunkToFile(testChunk, testFileName)).rejects
			.toBe(errorMessage).then(() => {
			//Verify that no chunk data was written
			expect(writtenData.length).toBe(0);
			
			//Verify that ensureFilePathExists was called with the correct file name
			expect(fileIO.ensureFilePathExists).toHaveBeenCalledTimes(1);
			expect(fileIO.ensureFilePathExists).toHaveBeenCalledWith(testFileName);
			
			//Verify that createWriteableFileStream was called with the correct file name
			expect(fileIO.createWriteableFileStream).toHaveBeenCalledTimes(1);
			expect(fileIO.createWriteableFileStream).toHaveBeenCalledWith(testFileName);
			
			//Verify that the end() function was called on our mock writeable stream
			expect(fileIO.createWriteableFileStream).toHaveBeenCalledTimes(1);
			expect(fileIO.createWriteableFileStream).toHaveBeenCalledWith(testFileName);
		});		
	});
	
	//Test writing a chunk when fileIO.ensureFilePathExists results in an error
	test('chunk is written to a file when the file path cannot be created', () => {
		//Mock fileIO.ensureFilePathExists to be successful
		fileIO.ensureFilePathExists.mockReturnValueOnce(Promise.reject());
				
		//Mock fileIO.createWriteableFileStream to return a mock writeable stream
		const writtenData = [];
		
		const mockWriteableStream = {
			on: jest.fn(),
			once: jest.fn(),
			end: jest.fn(),
			write: line => writtenData.push(parseInt(line))
		};
		
		fileIO.createWriteableFileStream.mockReturnValueOnce(mockWriteableStream);
		
		//Create a chunk and write it to a file
		const testChunk = [4, 5, -4, 23, 12, 8, -11, 82];
			
		return expect(fileIO.writeChunkToFile(testChunk, testFileName)).rejects
			.toBeUndefined().then(() => {
			//Verify that no chunk data was written
			expect(writtenData.length).toBe(0);
			
			//Verify that ensureFilePathExists was called with the correct file name
			expect(fileIO.ensureFilePathExists).toHaveBeenCalledTimes(1);
			expect(fileIO.ensureFilePathExists).toHaveBeenCalledWith(testFileName);
			
			//Verify that createWriteableFileStream was not called
			expect(fileIO.createWriteableFileStream).not.toHaveBeenCalled();
			
			//Verify that the end() function was not called on our mock writeable stream
			expect(fileIO.createWriteableFileStream).not.toHaveBeenCalled();
		});
	});	
});

/*Common Test Functions*/

/**
 * Creates an array of random integers between -100 and 100
 *
 * @param length - the size of the array to be created
 * @returns an array of randomly generated integers
 */
function createRandomIntegerArray(length) {
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
