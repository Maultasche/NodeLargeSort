/**
 * This is a proof-of-concept program to figure out how we will manage multiple streams
 * of data coming from files. In the final sorting program, we will always take the smallest
 * value from among the input files (which have been previously sorted), place that value
 * into the output stream, and then cause the same file stream to emit its next value while
 * the other files streams don't emit anything.
 *
 * We simulate file streams using Bacon buses to emit data.
 */
const Bacon = require('baconjs');
const _ = require('lodash');

//Define the number of data streams
const dataSize = 3;

//The actual data
const data = [
	[5, 6, 7, 12],
	[1, 8, 10, 11],
	[7, 9, 11, 15, 20]
];

//The pointers (by index) to the next data item to be emitted
const dataPointers = [ 0, 0, 0 ];

//Create the data streams as Bacon buses so that we can emit data when
//we choose to
const dataStreams = [ new Bacon.Bus(), new Bacon.Bus(), new Bacon.Bus() ];

//Store the final sequence of sorted integers
const sortedIntegers = [];

//Combine the data streams into a combined stream, which emits arrays with
//the current data items
const combinedStream = Bacon.combineAsArray(dataStreams);

//Output the combined values as they come across so that we can see what is
//happening
combinedStream.onValue(combinedValues => console.log(combinedValues));

//Map the combined stream to a stream of minimum value objects, which will
//contain information about the minimum value and which stream it belongs to
minValueStream = combinedStream.map(combinedValues => {
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
	
	if(!endOfData()) {
		//If there is data left to emit, then emit the next data item
		//on the stream with the minimum value.
		emitDataItem(minValueInfo.index);
	}
	else {
		//If there is no more data to emit, then indicate that the data streams
		//have ended
		dataStreams.forEach(stream => stream.end());
	}	
});

//Map the minimum value objects to integer minimum values, which will
//become the final output stream
outputStream = minValueStream.map(minValueInfo => minValueInfo.value);

//When the output stream emits a value, store it so that we can output
//the final sets of sorted integers at the end
outputStream.onValue(value => sortedIntegers.push(value));

//When we reach the end of the output stream, output the sortede integers
outputStream.onEnd(() => console.log("Sorted Integers: ", sortedIntegers));
 
//Emit the initial data items for each stream. This will start the chain
//of events that will result in a set of sorted integers from all streams
_.range(dataSize).forEach((index) => emitDataItem(index));



/* Functions */

/**
 * Emits the next data item on a data stream
 *
 * @param fileName - The name and path of a file
 * @returns A promise that will resolve when the directory exists or an
 * 	error occurred while attempting to create the directory
 */
function emitDataItem(streamIndex) {
	const dataArray = data[streamIndex];
	const dataIndex = dataPointers[streamIndex];
	const dataStream = dataStreams[streamIndex];
	
	//Calculate whether we'll be emitting the last data item
	const lastDataItem = dataPointers[streamIndex] === dataArray.length - 1;
	
	let dataItem = null;
	
	//If there is data left to emit for this stream, then retrieve it.
	//If there is no data left to emit for this stream, then emit null.
	if(endOfData(streamIndex)) {
		dataItem = null;
	}
	else {
		dataItem = dataArray[dataIndex];
	}
	
	console.log(`Pushing data "${dataItem}" to stream ${streamIndex}`);
	
	//Asynchronously push the data item onto the stream so that this function
	//will finish running first. Otherwise, we'll cause an immediate chain
	//of event handlers that won't work properly if we don't update the data
	//pointers.
	setImmediate(() => dataStream.push(dataItem));
		
	dataPointers[streamIndex]++;
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

/**
 * Indicates whether a data stream (or all of them) have reached the end
 * of their data
 *
 * @param dataIndex - The stream index of the data stream to be checked. If
 * 	this parameter is undefined, all data streams are checked
 * @returns true if the data stream(s) have reached the end of their data,
 *	otherwise false
 */
function endOfData(dataIndex) {
	let end = true;
	
	if(dataIndex === undefined) {
		//If no specific index was specified, see if there is still any data that
		//hasn't yet been emitted
		end = dataPointers.every((pointer, index) => pointer >= data[index].length);
	}
	else {
		//If a specific index was specified, check if there is unemitted data
		//for that data index
		end = dataPointers[dataIndex] >= data[dataIndex].length;
	}
	
	return end;
}
