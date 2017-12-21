const streamify = require('stream-array');

const _ = require('lodash');

describe('testing the creation of chunk files from the data in an input file', () => {
	jest.resetModules();
	
	//Mock various modules
	createMockModules();
	
	const ChunkFilesCreator = require('../../IntSort/sortedFilesMerger');
	const fileIO = require('../../IntSort/fileIO');
	
	//Reset the mock functions before each test
	beforeEach(() => {
		jest.clearAllMocks();		
	});	
	
	describe('testing the writing of chunks of various sizes', () => {
		test('chunk files are created for a large amount of input data with large chunk sizes', () => {
			const testData = generateRandomIntegerArray(1000);
			const chunkSize = 100;

			return testWithData(testData, chunkSize);
		});		
	});


	test("the 'chunk' event is emitted as expected", () => {
		//TODO: Implement
	});
	
	test('the processChunks() promise is rejected when the chunk stream throws an error', () => {
		//TODO: Implement
	});	
	
	/**
	 * Tests the chunk files creator with a particular set of input data
	 *
	 * @param {<Array.<number>} inputData - An array of numbers to be transformed into the input stream
	 * @param {number} chunkSize - The size of the chunks to be used when testing. This function
	 *	assumes that chunkSize > 0.
	 * @returns {Object} - A promise that resolves when the test is complete
	 */
	function testWithData(inputData, chunkSize) {
		const inputFile = 'input.txt';
		const intermediateFileTemplate = 'chunkFile-{{chunkNum}}.txt';
		const outputDirectory = 'outputdirectory';
		
		//Implement the createIntegerChunkStream() mock function in the mock fileIO module
		fileIO.createIntegerChunkStream
			.mockReturnValueOnce(createChunkStream(inputData, chunkSize));
		
		//Implement the writeChunkToFile() mock function in the mock fileIO module
		const writtenChunks = [];
		const writtenFileNames = [];
		
		fileIO.writeChunkToFile.mockImplementation((chunk, fileName) => {
			writtenChunks.push(chunk);
			writtenFileNames.push(chunk);
		});
		
		//Calculate the expected data
		const numOfChunks = Math.ceil(inputData.length / chunkSize);
		const expectedChunks = _.chunk(inputData, chunkSize)
			.map(chunk => {
				chunk.sort((a, b) => a - b);
				
				return chunk;
			}
		
		//Create a chunk files creator object
		chunkFilesCreator = new ChunkFilesCreator(inputFile, chunkSize, intermediateFileTemplate);
		
		expect.hasAssertions();
		
		//Start processing the chunks
		return expect(chunkFilesCreator.processChunks(outputDirectory)).resolves.toBeDefined()
			.then(intermediateFiles => {
				//Verify that fileIO.createReadStream() was called with the correct file name
				
				//Verify that mock readstream object and the correct chunk size was passed
				//to fileIO.createIntegerChunkStream()				
			});
	}
	
	// /**
	 // * Creates a Node readable stream from an array of data. Each data item will
	 // * have a newline ('\n') added to the end of it to simulate a multiline text
	 // * data stream.
	 // *
	 // * @param {Array.<number>} dataArray - an array of numbers to be converted
	 // *	to a Node readable stream
	 // * @returns a Node readable stream that emits the integers in dataArray 
	 // *	converted to a string with a newline ('\n') at the end
	 // */
	// function createNodeReadableStream(dataArray) {
		// const streamify = require('stream-array');
		
		// //Transform the data do add a newline character
		// const stringData = dataArray.map(number => number + '\n');
		
		// //Convert the string data to a Node readable string
		// return streamify(stringData);
	// }
	
	// /**
	 // * Creates a Node writeable stream that adds all written data to
	 // * an array as an integer
	 // *
	 // * @param {Array.<number>} dataArray - an array to which any writes to the stream
	 // *	will be added
	 // * @returns a Node writeable stream 
	 // */
	// function createNodeWriteableStream(dataArray) {
		// const mockWriteableStream = {
			// on: jest.fn(),
			// end: jest.fn(),
			// write: line => dataArray.push(parseInt(line))			
		// };
		
		// return mockWriteableStream;
	// }
	
	// /**
	 // * Merges and sorts all the integers in one or more integer arrays
	 // *
	 // * @param {Array.<Array.<number>>} integerArrays - One or more integer
	 // *	arrays that will be merged and sorted
	 // * @returns {Array.<number>} an array containing the merged and sorted values
	 // */
	// function mergeAndSortIntegerArrays(integerArrays) {
		// //Merge the arrays by flattening them
		// const mergedArray = _.flatten(integerArrays);

		// //Sort the merged array
		// const sortedArray = _.sortBy(mergedArray, integer => integer);
		
		// return sortedArray;
	// }
	
	/**
	 * Creates a stream that emits chunks of data
	 *
	 * @param {Array.<*>} streamData - An array containing the data to be emitted
	 *	in chunks
	 * @param {number} chunkSize - The number of data elements to be emitted as
	 *	a single chunk
	 * @returns a stream that emits arrays of length chunkSize. The last chunk may
	 *	be smaller than chunkSize if there's not enough data elements remaining to
	 *	fill the chunk.
	 */
	function createChunkStream(streamData, chunkSize) {
		return Bacon.fromArray(_.chunk(streamData, chunkSize));
	}
	
	/**
	 * Generates an array of random integers
	 *
	 * @param count - The number of random integers to be generated
	 * @returns An array containing the randomly-generated integers
	 */
	function generateRandomIntegerArray(count) {
		return _.range(count).map(() => generateRandomInteger(1, 100));
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
	
	/**
	 * Creates the mock modules needed for this suite of tests
	 */
	function createMockModules() {
		createMockFileIOModule();
		createMockFsModule();
	}
	
	/**
	 * Creates the mock fileIO module needed for this suite of tests
	 */
	function createMockFileIOModule() {
		const ensureDirectoryExists = jest.fn();
		const createIntegerChunkStream = jest.fn();
		
		//Mock the fileIO  module
		jest.doMock('../../IntSort/fileIO', () => ({ 
			ensureDirectoryExists,
			createIntegerChunkStream,
			writeChunkToFile
		}));
		
		//Mock ensureDirectoryExists to return a resolved promise
		ensureDirectoryExists.mockImplementation(() => Promise.resolve());		
	}
	
/**
	 * Creates the mock fs module needed for this suite of tests
	 */
	function createMockFsModule() {
		const createReadStream = jest.fn();
		
		//Mock the fileIO  module
		jest.doMock('fs', () => ({ createReadStream }));
	}	
});