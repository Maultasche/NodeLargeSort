const Bacon = require('baconjs');
const S = require('string');
const path = require('path');
const _ = require('lodash');

describe('testing the creation of chunk files from the data in an input file', () => {
	jest.resetModules();
	
	//Mock various modules
	createMockModules();
	
	const fs = require('fs');
	const fileIO = require('../../IntSort/fileIO');
	const ChunkFilesCreator = require('../../IntSort/chunkFilesCreator');	
	
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

		test('chunk files are created for a small amount of input data with small chunk sizes', () => {
			const testData = generateRandomIntegerArray(20);
			const chunkSize = 2;
			
			return testWithData(testData, chunkSize);
		});

		test('chunk files are created for chunks where the number of chunks does not evently' + 
			'divide the number of integers', () => {
			const testData = generateRandomIntegerArray(27);
			const chunkSize = 10;
			
			return testWithData(testData, chunkSize);
		});	
		
		test('chunk files are created where the chunk size is one', () => {
			const testData = generateRandomIntegerArray(25);
			const chunkSize = 1;
			
			return testWithData(testData, chunkSize);
		});
		
		test('chunk files are created where the chunk size is equal to the number of integers', () => {
			const testData = generateRandomIntegerArray(30);
			const chunkSize = 30;
			
			return testWithData(testData, chunkSize);
		});

		test('chunk files are created where the chunk size is larger than the number of integers', () => {
			const testData = generateRandomIntegerArray(30);
			const chunkSize = 50;
			
			return testWithData(testData, chunkSize);
		});		

		test('chunk files are not created where there is no data', () => {
			const testData = [];
			const chunkSize = 10;
			
			return testWithData(testData, chunkSize);
		});
	});

	test("the 'chunk' event is emitted as expected", () => {
		const testData = generateRandomIntegerArray(10);
		const chunkSize = 2;
		const inputFile = 'input.txt';
		const intermediateFileTemplate = 'chunkFile-{{chunkNum}}.txt';
		const outputDirectory = 'outputdirectory';
		const mockReadStream = {};
		
		//Implement the createReadStream() mock function in the fs module
		fs.createReadStream.mockReturnValueOnce(mockReadStream);
		
		//Implement the createIntegerChunkStream() mock function in the mock fileIO module
		fileIO.createIntegerChunkStream
			.mockReturnValueOnce(createChunkStream(testData, chunkSize));
		
		//Implement the writeChunkToFile() mock function in the mock fileIO module
		fileIO.writeChunkToFile.mockReturnValue(Promise.resolve());
		
		//Calculate the expected data
		const numOfChunks = Math.ceil(testData.length / chunkSize);
		const expectedChunkNumbers = _.range(1, numOfChunks + 1);
				
		//Create a chunk files creator object
		chunkFilesCreator = new ChunkFilesCreator(inputFile, chunkSize, intermediateFileTemplate);
		
		//Subscribe to the 'chunk' event and record the chunk numbers emitted
		const actualChunkNumbers = [];
		
		chunkFilesCreator.on('chunk', chunkNum => actualChunkNumbers.push(chunkNum));
			
		expect.hasAssertions();
		
		return chunkFilesCreator.processChunks(outputDirectory)
			.then(intermediateFiles => {
				//Verify that the expected chunk numbers were emitted via the 'chunk' event
				expect(actualChunkNumbers).toEqual(expectedChunkNumbers);
			});
	});
	
	test('the processChunks() promise is rejected when the chunk stream throws an error', () => {
		const inputFile = 'input.txt';
		const intermediateFileTemplate = 'chunkFile-{{chunkNum}}.txt';
		const outputDirectory = 'outputdirectory';
		const mockReadStream = {};
		const chunkSize = 2;
		const testData = [[1, 2], [4, 3]];
		
		//Implement the createReadStream() mock function in the fs module
		fs.createReadStream.mockReturnValueOnce(mockReadStream);
		
		const errorMessage = 'An error has occurred';
		
		//Create a stream that generates in an error
		const errorStream = Bacon.fromBinder(sink => {
			sink(testData[0]);
			sink(testData[1]);
			
			sink(new Bacon.Error(errorMessage));
			
			sink(new Bacon.End());
			
			return () => {};
		});
		
		//Implement the createIntegerChunkStream() mock function in the mock fileIO module
		fileIO.createIntegerChunkStream
			.mockReturnValueOnce(errorStream);
				
		//Implement the writeChunkToFile() mock function in the mock fileIO module
		const writtenChunks = [];
		const writtenFileNames = [];
		
		fileIO.writeChunkToFile.mockImplementation((chunk, fileName) => {
			return new Promise((resolve, reject) => {
				writtenChunks.push(chunk);
				writtenFileNames.push(fileName);

				resolve();
			});
		});
		
		//Calculate the expected data
		const expectedChunks = []			
		const expectedIntermediateFiles = [];
		
		//Create a chunk files creator object
		chunkFilesCreator = new ChunkFilesCreator(inputFile, chunkSize, intermediateFileTemplate);
		
		expect.hasAssertions();
		
		return expect(chunkFilesCreator.processChunks(outputDirectory)).rejects.toBe(errorMessage)
			.then(() => {
				//Verify that the expected chunks were written
				expect(writtenChunks).toEqual(expectedChunks);
				
				//Verify that the expected intermediate files were written to
				expect(writtenFileNames).toEqual(expectedIntermediateFiles);
				
				//Verify that fs.createReadStream() was called with the correct file name
				expect(fs.createReadStream).toHaveBeenCalledWith(inputFile);
				
				//Verify that mock readstream object and the correct chunk size was passed
				//to fileIO.createIntegerChunkStream()				
				expect(fileIO.createIntegerChunkStream).toHaveBeenCalledWith(
					mockReadStream, chunkSize);
			});
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
		const mockReadStream = {};
		
		//Implement the createReadStream() mock function in the fs module
		fs.createReadStream.mockReturnValueOnce(mockReadStream);
		
		//Implement the createIntegerChunkStream() mock function in the mock fileIO module
		fileIO.createIntegerChunkStream
			.mockReturnValueOnce(createChunkStream(inputData, chunkSize));
				
		//Implement the writeChunkToFile() mock function in the mock fileIO module
		const writtenChunks = [];
		const writtenFileNames = [];
		
		fileIO.writeChunkToFile.mockImplementation((chunk, fileName) => {
			return new Promise((resolve, reject) => {
				writtenChunks.push(chunk);
				writtenFileNames.push(fileName);

				resolve();
			});

		});
		
		//Calculate the expected data
		const numOfChunks = Math.ceil(inputData.length / chunkSize);
		const expectedChunks = _.chunk(inputData, chunkSize)
			.map(chunk => {
				chunk.sort((a, b) => a - b);
				
				return chunk;
			});
			
		const expectedIntermediateFiles = _.range(1, numOfChunks + 1)
			.map(chunkNum => {
				const intermediateFileName = path.join(outputDirectory,
					S(intermediateFileTemplate).template({ chunkNum }).s);

				return intermediateFileName;
			});
		
		//Create a chunk files creator object
		chunkFilesCreator = new ChunkFilesCreator(inputFile, chunkSize, intermediateFileTemplate);
		
		expect.hasAssertions();
		
		return chunkFilesCreator.processChunks(outputDirectory)
			.then(intermediateFiles => {
				//Verify that the expected chunks were written
				expect(writtenChunks).toEqual(expectedChunks);
				
				//Verify that the expected intermediate files were written to
				expect(writtenFileNames).toEqual(expectedIntermediateFiles);
				
				//Verify that the expected intermediate files were obtained from the
				//resolved promise
				expect(intermediateFiles).toEqual(expectedIntermediateFiles);
				
				//Verify that fs.createReadStream() was called with the correct file name
				expect(fs.createReadStream).toHaveBeenCalledWith(inputFile);
				
				//Verify that mock readstream object and the correct chunk size was passed
				//to fileIO.createIntegerChunkStream()				
				expect(fileIO.createIntegerChunkStream).toHaveBeenCalledWith(
					mockReadStream, chunkSize);
			});
	}
	
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
		return Bacon.sequentially(0, _.chunk(streamData, chunkSize));
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
		const writeChunkToFile = jest.fn();
		
		//Mock the fileIO  module
		jest.doMock('../../IntSort/fileIO', () => ({ 
			ensureDirectoryExists,
			createIntegerChunkStream,
			writeChunkToFile
		}));
		
		//Mock ensureDirectoryExists to return a resolved promise
		ensureDirectoryExists.mockReturnValue(Promise.resolve());				
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