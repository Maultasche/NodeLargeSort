const streamify = require('stream-array');
const SortedFilesMerger = require('../../IntSort/sortedFilesMerger');
const _ = require('lodash');

describe('testing the merging of sorted input streams into an output stream', () => {
	test('multiple streams containing multiple integers are merged correctly', () => {
		const inputData = [
			[-10, -3, 32, 54],
			[-8, -1, 0, 1, 2, 5, 7, 9, 10, 12, 12, 12, 14, 21, 35],
			[-22, 4, 45],
			[4, 5, 6, 7, 8, 9, 10, 18, 20, 23, 31],
			[-1, 0, 1, 20, 40, 50],
			[-10, -9, -8, -7, -6, -2, -1, 0]
		];
		
		return testWithData(inputData);
	});
	
	test('two streams containing multiple integers are merged correctly', () => {
		const inputData = [
			[-2, 3, 8, 12],
			[-8, 5, 6, 10, 12, 15, 17, 19, 20, 22, 22]
		];
		
		return testWithData(inputData);		
	});
	
	test('multiple streams containing a single integer are merged correctly', () => {
		const inputData = [
			[-10],
			[-4],
			[22],
			[6],
			[-1],
			[0]
		];
		
		return testWithData(inputData);
	});
	
	test('a single stream containing multiple integers is merged correctly', () => {
		const inputData = [
			[-8, -2, 3, 5, 6, 8, 10, 12, 12, 15, 17, 19, 20, 22, 22]
		];
		
		return testWithData(inputData);		
	});
	
	test('a single stream containing a single integer is merged correctly', () => {
		const inputData = [
			[0]
		];
		
		return testWithData(inputData);
	});
	
	/**
	 * Tests the sorted files merger with a particular set of input data
	 *
	 * @param {Array.<Array.<number>>} - An array of number arrays, where each number
	 *	array represents an input stream of integers
	 * @returns {Object} - A promise that resolves when the test is complete
	 */
	function testWithData(inputData) {
		//Create Node readable streams from the input data
		const inputStreams = inputData
			.map(dataArray => createNodeReadableStream(dataArray));
			
		//Create a Node writeable stream that writes to an array
		const actualSortedIntegers = [];
		
		const outputStream = createNodeWriteableStream(actualSortedIntegers);
		
		//Calculate the expected sorted integers
		const expectedSortedIntegers = mergeAndSortIntegerArrays(inputData);
		
		//Construct the sorted files merger
		const sortedFilesMerger = new SortedFilesMerger(inputStreams, outputStream);
		
		//Handle the 'integer' event
		const eventIntegers = [];
		
		sortedFilesMerger.on('integer', integer => eventIntegers.push(integer));
		
		expect.hasAssertions();
		
		//Merge the sorted streams
		return expect(sortedFilesMerger.mergeSortedFiles()).resolves.not.toBeDefined()
			.then(() => {
				//Verify that the sorted integers that were written to the output stream
				//match the sorted integers we were expecting
				expect(actualSortedIntegers).toEqual(expectedSortedIntegers);

				//Verify that we received all the sorted integers as values in integer events
				expect(eventIntegers).toEqual(expectedSortedIntegers);
			});	
	}
	
	/**
	 * Creates a Node readable stream from an array of data. Each data item will
	 * have a newline ('\n') added to the end of it to simulate a multiline text
	 * data stream.
	 *
	 * @param {Array.<number>} dataArray - an array of numbers to be converted
	 *	to a Node readable stream
	 * @returns a Node readable stream that emits the integers in dataArray 
	 *	converted to a string with a newline ('\n') at the end
	 */
	function createNodeReadableStream(dataArray) {
		const streamify = require('stream-array');
		
		//Transform the data do add a newline character
		const stringData = dataArray.map(number => number + '\n');
		
		//Convert the string data to a Node readable string
		return streamify(stringData);
	}
	
	/**
	 * Creates a Node writeable stream that adds all written data to
	 * an array as an integer
	 *
	 * @param {Array.<number>} dataArray - an array to which any writes to the stream
	 *	will be added
	 * @returns a Node writeable stream 
	 */
	function createNodeWriteableStream(dataArray) {
		const mockWriteableStream = {
			on: jest.fn(),
			end: jest.fn(),
			write: line => dataArray.push(parseInt(line))			
		};
		
		return mockWriteableStream;
	}
	
	/**
	 * Merges and sorts all the integers in one or more integer arrays
	 *
	 * @param {Array.<Array.<number>>} integerArrays - One or more integer
	 *	arrays that will be merged and sorted
	 * @returns {Array.<number>} an array containing the merged and sorted values
	 */
	function mergeAndSortIntegerArrays(integerArrays) {
		//Merge the arrays by flattening them
		const mergedArray = _.flatten(integerArrays);

		//Sort the merged array
		const sortedArray = _.sortBy(mergedArray, integer => integer);
		
		return sortedArray;
	}
});