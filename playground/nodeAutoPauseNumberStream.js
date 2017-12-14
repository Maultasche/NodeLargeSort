/**
 * This is a proof-of-concept program to figure out how we will manage multiple streams
 * of data coming from files. In the final sorting program, we will always take the smallest
 * value from among the input files (which have been previously sorted), place that value
 * into the output stream, and then cause the same file stream to emit its next value while
 * the other files streams don't emit anything.
 *
 * This differs from nodeNumberStream.js in that we use the bacon-node-autopause-line-stream 
 * package to read integers from Node.js readable streams instead of using Bacon buses.
 */
const Bacon = require('baconjs');
const _ = require('lodash');
const streamify = require('stream-array');
const createAutoPauseLineStream = require('bacon-node-autopause-line-stream');

//Define the number of data streams
const dataSize = 3;

//The actual data
const data = [
	[5, 6, 7, 12],
	[1, 8, 10, 11, 14],
	[7, 9, 11, 15, 20, 22]
];

//Create the Node.js readable streams that emit lines of text, just like an actual
//file stream would
const nodeNumberStreams = createNodeReadableStreamsFromArrays(data
	.map(numberArray => numberArray.map(number => number + '\n')));

//Transform the Node.js readable streams into Bacon streams
const lineStreams = nodeNumberStreams
	.map(nodeStream => createAutoPauseLineStream(nodeStream));
	
const dataStreams = lineStreams
	.map(lineStream => lineStream
		.map(({ line, resume }) => ({ integer: parseInt(line), resume }))
		.concat(Bacon.once(null))
	);

//Store the final sequence of sorted integers
const sortedIntegers = [];

//Combine the data streams into a combined stream, which emits arrays with
//the current data items
const combinedStream = Bacon.combineAsArray(dataStreams);

//Output the combined values as they come across so that we can see what is
//happening
combinedStream.onValue(combinedValues => console.log(combinedValues
	.map(value => value === null ? null : value.integer)));

//Map the combined stream to a stream of minimum value objects, which will
//contain information about the minimum value and which stream it belongs to
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

//Whenever we get a new minimum value object, that means the current
//combined values have been processed. So we need to cause the data stream
//with the minimum value to emit its next value. We do this in the onValue
//function because it is a side effect, which doesn't belong in a map function.
minValueStream.onValue(minValueInfo => {
	//Display the minimum value information so that we can see
	//what is happening. This is a side effect, so belongs here in the
	//onValue function.
	console.log(JSON.stringify(minValueInfo));
	
	//Resume the data stream with the minimum value
	minValueInfo.resume();
});

//Map the minimum value objects to integer minimum values, which will
//become the final output stream
outputStream = minValueStream.map(minValueInfo => minValueInfo.value);

//When the output stream emits a value, store it so that we can output
//the final sets of sorted integers at the end
outputStream.onValue(value => sortedIntegers.push(value));

//When we reach the end of the output stream, output the sorted integers
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

