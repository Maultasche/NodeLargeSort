/**
 * Contains a file merger class, which will read integers from multiple sorted
 * intermediate files, merge them together, and produce a single sorted output
 * file containing the integers from all the input files
 */
 
const Promise = require('bluebird');
const EventEmitter = require('events');
const Bacon = require('baconjs');
const createLineStream = require('bacon-node-line-stream');
const _ = require('lodash');

//const fs = Promise.promisifyAll(require('fs'));
//const fileIO = require('./fileIO');
//const S = require('string');
//const path = require('path');

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
			//Create pause streams that indicate whether the correponding data stream should
			//pause itself
			const pauseStreams = this.inputFileStreams.map(() => new Bacon.Bus());
			
			//Transform the Node.js readable streams into Bacon streams
			const dataStreams = this.inputFileStreams
				.map(nodeStream => createLineStream(nodeStream))
				.map((lineStream, index) => 
					lineStream.holdWhen(pauseStreams[index].toProperty(false)))
				.map(lineStream => lineStream
					.map(numberString => parseInt(numberString))
					.concat(Bacon.once(null)));	

			dataStreams.forEach((stream, index) => 
				stream.onValue(value => console.log(`Stream ${index} is emitting a ${value}`)));
				
			//Map the Bacon data streams into streams that can pause themselves when the
			//correponding pause stream property is true
			//const pausableDataStreams = _.zip(dataStreams, pauseStreams)
			//	.map(streamArray => streamArray[0].holdWhen(streamArray[1].toProperty(false)));
			
			const pausableDataStreams = dataStreams;

			//After a data stream emits a single value, pause it
			pausableDataStreams.forEach(
				(dataStream, index) => dataStream.onValue(
					value => {
						console.log(`Integer emitted on stream ${index}: ${value}`);
						console.log(`pausing stream ${index}`);
						setDataStreamPaused(pauseStreams[index], true);
					}
				)
			);	

			//Combine the data streams into a combined stream, which emits arrays with
			//the current data items
			const combinedStream = Bacon.combineAsArray(pausableDataStreams);

			combinedStream.onValue(value => console.log("Combined value: ", value));			
			
			//Transform the combined stream to a stream of minimum value objects, which will
			//contain information about the minimum value of each combined stream array
			//and which input stream it belongs to.
			const minValueStream = this._createMinValueStream(combinedStream);

			//Whenever we get a new minimum value object, that means the current
			//combined values have been processed. So we need to cause the data stream
			//with the minimum value to emit its next value. We do this in the onValue
			//function because it is a side effect, which doesn't belong in a map function.
			minValueStream.onValue(minValueInfo => {
				console.log("Min Value Stream: ", JSON.stringify(minValueInfo));
				console.log(`Unpausing stream ${minValueInfo.index}`);
				
				setDataStreamPaused(pauseStreams[minValueInfo.index], false);	
			});	

			//Map the minimum value objects to integer minimum values, which will
			//become the final output stream
			const outputStream = minValueStream.map(minValueInfo => minValueInfo.value);

			//When the output stream emits a value, write it to the output file
			outputStream.onValue(integer => {
				this.outputFileStream.write(integer + '\n')
				
				console.log("Output value: ", integer);
			});

			//Add an error handler to the output stream that will clean up if something
			//goes wrong
			outputStream.onError(error => {
				console.log("Error: ", error);
				this._closeFileStreams();
				
				reject(error);
			});
			
			//When we reach the end of the sorted integer output stream, 
			//close the files and resolve the promise
			outputStream.onEnd(() => {
				console.log("Output End!");
				
				this._closeFileStreams();
				
				resolve();
			});			
		});	
	}
	
	/**
	 * Takes a combined stream, which emits the current input stream values as
	 * an array and transforms it into a minimum value stream, which emits objects
	 * that contain the minimum value in each array and its corresponding index
	 *
	 * @param {Object} combinedStream - The combined stream
	 * @returns {Object} the minimum value stream
	 */
	_createMinValueStream(combinedStream) {
		//Transform the combined stream to a stream of minimum value objects, which will
		//contain information about the minimum value and which input stream it belongs to
		const minValueStream = combinedStream
			//Filter out the last value, which is an array of all nulls
			.filter(combinedValues => combinedValues.some(value => value !== null))
			//Map the combined values to minimum value objects
			.map(combinedValues => {
				//Find and return the minimum value
				const minValueInfo = combinedValues.reduce(findMinValueInfo, {
					value: Number.MAX_VALUE,
					index: -1
				});
				
				return minValueInfo;
			});

		return minValueStream;
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
 * Sets whether a data stream is paused by pushing a value into the 
 * corresponding pause stream
 *
 * @param {number} pauseStream - The pause stream corresponding to the 
 *	data stream to pause/unpause
 * @param {boolean} pause - true if the data stream is to be paused, false
 *	if is to be unpaused
 * @returns {Array.<Array.<Object>>} A set of Node streams
 */
function setDataStreamPaused(pauseStream, pause) {
	console.log("Start push: ", pause);
	pauseStream.push(pause);
	console.log("Finish push", pause);
}

/**
 * Compares a minimum value object to the current value and returns
 * a minimum value object describing the new minimum value and index
 *
 * @param minValueInfo - The object describing the previous minimum
 * 	value and index
 * @param currentValue - The current value to be compared
 * @param currentIndex - The index of the current value
 * @returns The object describing the current minimum value and index
 * 	after the comparison between the previous minimum value and the
 * 	current value.
 */
function findMinValueInfo(minValueInfo, currentValue, currentIndex) {
	if(currentValue !== null && currentValue <= minValueInfo.value) {
		minValueInfo.value = currentValue;
		minValueInfo.index = currentIndex;
	}
	
	return minValueInfo;
}
	
module.exports = SortedFilesMerger;
