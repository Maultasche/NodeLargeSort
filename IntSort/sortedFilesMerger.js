/**
 * Contains a file merger class, which will read integers from multiple sorted
 * intermediate files, merge them together, and produce a single sorted output
 * file containing the integers from all the input files
 */
 
const Promise = require('bluebird');
const EventEmitter = require('events');
const Bacon = require('baconjs');
const createAutoPauseLineStream = require('bacon-node-autopause-line-stream');
const _ = require('lodash');

class SortedFilesMerger extends EventEmitter {
	/**
	 * Constructs a sorted files merger
	 *
	 * @param {Object[]) inputFileStreams - An array containing the readable streams
	 * 	of data from the input files that are being merged
	 * @param {string} outputFileStream - A writeable stream to the output file
	 *	to which the sorted integers will be written	 
	 */	
	constructor(inputFileStreams, outputFileStream) {
		super();
		
		this.inputFileStreams = inputFileStreams;
		this.outputFileStream = outputFileStream;		
	}
	
	/**
	 * Starts reading integers from the input file streams and writing
	 * them to an output file stream
	 *
	 * At any particular time, we are only storing one integer per file in memory.
	 *
	 * The following events will be emitted:
	 * - 'integer': emitted when an integer is written to the output file
	 *	 
	 * @returns {Object} a promise that resolves when the operation is complete
	 */
	mergeSortedFiles() {
		return new Promise((resolve, reject) => {
			//Transform the Node.js readable streams into autopause Bacon streams
			const lineStreams = this.inputFileStreams
				.map(nodeStream => createAutoPauseLineStream(nodeStream));

			//Map the line streams to a data stream that emits an object containing
			//an integer and a stream resume function
			const dataStreams = lineStreams
				.map(lineStream => lineStream
					.map(({ line, resume }) => ({ integer: parseInt(line), resume }))
					.concat(Bacon.once(null))
				);

			//Combine the data streams into a combined stream, which emits arrays with
			//the current data items
			const combinedStream = Bacon.combineAsArray(dataStreams);

			//Transform the combined stream to a stream of minimum value objects, which will
			//contain information about the minimum value of each combined stream array
			//and which input stream it belongs to.
			const minValueStream = createMinValueStream(combinedStream);

			//Whenever we get a new minimum value object, that means the current
			//combined values have been processed. So we need to cause the data stream
			//with the minimum value to emit its next value. We do this in the onValue
			//function because it is a side effect, which doesn't belong in a map function.
			minValueStream.onValue(minValueInfo => {
				//Resume the data stream with the minimum value
				minValueInfo.resume();	
			});	

			//Map the minimum value objects to integer minimum values, which will
			//become the final output stream
			const outputStream = minValueStream.map(minValueInfo => minValueInfo.value);

			//When the output stream emits a value, write it to the output file
			outputStream.onValue(integer => {
				this.outputFileStream.write(integer + '\n')
			});

			//Add an error handler to the output stream that will clean up if something
			//goes wrong
			outputStream.onError(error => {
				this._closeFileStreams();
				
				reject(error);
			});
			
			//When we reach the end of the sorted integer output stream, 
			//close the files and resolve the promise
			outputStream.onEnd(() => {
				this._closeFileStreams();
				
				resolve();
			});			
		});	
	}
		
	/**
	 * Closes the output file stream. The input streams do not need to be closed.
	 */
	_closeFileStreams() {	
		//Close the output stream
		this.outputFileStream.end();		
	}
}

/**
 * Takes a combined stream, which emits the current input stream values as
 * an array and transforms it into a minimum value stream, which emits objects
 * that contain the minimum value in each array and its corresponding index
 *
 * @param {Object} combinedStream - The combined stream
 * @returns {Object} the minimum value stream
 */
function createMinValueStream(combinedStream) {
	//Transform the combined stream to a stream of minimum value objects, which will
	//contain information about the minimum value and which input stream it belongs to
	const minValueStream = combinedStream
		//Filter out the last value, which is an array of all nulls
		.filter(combinedValues => combinedValues.some(value => value !== null))
		//Map the combined values to minimum value objects
		.map(combinedValues => {
			//Find and return the minimum value
			const minValueInfo = combinedValues
				//Reduce the integers, resume pair to a min value object
				.reduce(findMinValueInfo, {
					value: Number.MAX_VALUE,
					resume: null
				});
			
			return minValueInfo;
		});

	return minValueStream;
}
	
/**
 * Compares a minimum value object to the current value and returns
 * a minimum value object describing the new minimum value and index
 *
 * @param minValueInfo - The object describing the previous minimum
 * 	value and index
 * @param currentValue - The current value to be compared
 * @returns The object describing the current minimum value and index
 * 	after the comparison between the previous minimum value and the
 * 	current value.
 */
function findMinValueInfo(minValueInfo, currentValue) {
	if(currentValue !== null && currentValue.integer <= minValueInfo.value) {
		minValueInfo.value = currentValue.integer;
		minValueInfo.resume = currentValue.resume;
	}
	
	return minValueInfo;
}
	
module.exports = SortedFilesMerger;
