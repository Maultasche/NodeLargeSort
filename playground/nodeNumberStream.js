/**
 * This is a proof-of-concept program to figure out how we will manage multiple streams
 * of data coming from files. In the final sorting program, we will always take the smallest
 * value from among the input files (which have been previously sorted), place that value
 * into the output stream, and then cause the same file stream to emit its next value while
 * the other files streams don't emit anything.
 *
 * This differs from numberStream.js in that we use the bacon-node-line-stream package
 * to read integers from Node.js readable streams instead of using Bacon buses.
 */
const Bacon = require('baconjs');
const _ = require('lodash');
const streamify = require('stream-array');
const createLineStream = require('bacon-node-line-stream');

//Define the number of data streams
const dataSize = 3;

//The actual data
const data = [
	[5, 6, 7, 12],
	[1, 8, 10, 11, 14],
	[7, 9, 11, 15, 20, 22]
];

//Create pause streams that indicate whether the correponding data stream should
//pause itself
const pauseStreams = data.map(() => new Bacon.Bus());

//Create the Node.js readable streams that emit lines of text, just like an actual
//file stream would
const nodeNumberStreams = createNodeReadableStreamsFromArrays(data
	.map(numberArray => numberArray.map(number => number + '\n')));

//Transform the Node.js readable streams into Bacon streams
const dataStreams = nodeNumberStreams
	.map(nodeStream => createLineStream(nodeStream))
	.map(lineStream => lineStream
		.map(numberString => parseInt(numberString))
		.concat(Bacon.once(null)));

//Map the Bacon streams into streams that can pause themselves when the
//correponding pause stream property is true
const pausableDataStreams = _.zip(dataStreams, pauseStreams)
	.map(streamArray => streamArray[0].holdWhen(streamArray[1].toProperty(false)))	

//After a data stream emits a single value, pause it
pausableDataStreams.forEach((dataStream, index) => dataStream.onValue(value => {
	setDataStreamPaused(index, true);
}));

//Store the final sequence of sorted integers
const sortedIntegers = [];

//Combine the data streams into a combined stream, which emits arrays with
//the current data items
const combinedStream = Bacon.combineAsArray(pausableDataStreams);

//Output the combined values as they come across so that we can see what is
//happening
combinedStream.onValue(combinedValues => console.log(combinedValues));

//Map the combined stream to a stream of minimum value objects, which will
//contain information about the minimum value and which stream it belongs to
minValueStream = combinedStream
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

//Whenever we get a new minimum value object, that means the current
//combined values have been processed. So we need to cause the data stream
//with the minimum value to emit its next value. We do this in the onValue
//function because it is a side effect, which doesn't belong in a map function.
minValueStream.onValue(minValueInfo => {
	//Display the minimum value information so that we can see
	//what is happening. This is a side effect, so belongs here in the
	//onValue function.
	console.log(JSON.stringify(minValueInfo));
	
	
	setDataStreamPaused(minValueInfo.index, false);	
});

//Map the minimum value objects to integer minimum values, which will
//become the final output stream
outputStream = minValueStream.map(minValueInfo => minValueInfo.value);

//When the output stream emits a value, store it so that we can output
//the final sets of sorted integers at the end
outputStream.onValue(value => sortedIntegers.push(value));

//When we reach the end of the output stream, output the sortede integers
outputStream.onEnd(() => console.log("Sorted Integers: ", sortedIntegers));

/* Functions */

/**
 * Creates multiple Node.js readable streams using the data found in a set
 * of arrays with one stream created per array
 *
 * @param {Array.<Array.<number>>} arrays - A set of arrays to transform into Node streams
 * @returns {Array.<Array.<Object>>} A set of Node streams
 */
function createNodeReadableStreamsFromArrays(arrays) {
	return arrays.map(numberArray => streamify(numberArray));
}

/**
 * Sets whether a data stream is paused by pushing a value into the 
 * corresponding pause stream
 *
 * @param {number} index - The index of the data stream to pause/unpause
 * @param {boolean} pause - true if the data stream is to be paused, false
 *	if is to be unpaused
 * @returns {Array.<Array.<Object>>} A set of Node streams
 */
function setDataStreamPaused(index, pause) {
	console.log(`Data Stream ${index}: ${pause}`);
	pauseStreams[index].push(pause);
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

