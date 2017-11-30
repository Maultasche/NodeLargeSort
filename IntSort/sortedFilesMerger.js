/**
 * Contains a file merger class, which will read integers from multiple sorted
 * intermediate files, merge them together, and produce a single sorted output
 * file containing the integers from all the input files
 */
 
const Promise = require('bluebird');
const EventEmitter = require('events');
const Bacon = require('baconjs');
//const fs = Promise.promisifyAll(require('fs'));
//const fileIO = require('./fileIO');
//const S = require('string');
//const path = require('path');

class SortedFilesMerger extends EventEmitter {
	/**
	 * Constructs a sorted files merger
	 *
	 * @param inputFiles - An array containing the names of the sorted 
	 *	intermediate files to read integers from
	 */	
	constructor(inputFiles) {
		super();
		
		this.inputFile = inputFile;
	}
	
	/**
	 * Starts reading integers from the input files and writing
	 * them to an output file
	 *
	 * At any particular time, we are only storing one integer per file in memory.
	 *
	 * The following events will be emitted:
	 * - 'integer': emitted when an integer is written to the output file
	 *
	 * @param {string} outputFile - The name of the output file to be written to
	 * @returns {string} a promise that resolves to the name of the output file
	 */
	mergeSortedFiles(outputFile) {
		//Ensure that the output file path exists
		return fileIO.ensureFilePathExists(outputFile)
			.then(() =>	{
				// return new Promise((resolve, reject) => {
					// //Create the readable file stream
					// const readStream = fs.createReadStream(this.inputFile);

					// //Create the chunk stream from the readable file stream
					// const chunkStream = fileIO.createIntegerChunkStream(readStream, 
						// this.chunkSize);
					
					// //Set the error handler
					// chunkStream.onError(error => reject(error));

					// const intermediateFiles = [];
					
					// let chunkNum = 0;
					
					// //Set up the chunk processing pipeline			
					// chunkStream
						// //Sort the chunk numerically
						// .map(chunk => {
							// chunk.sort((a, b) => a - b);
							
							// return chunk;
						// })
						// //Write the sorted chunk to a file
						// .onValue(chunk => {
							// chunkNum++;
							
							// //Create the intermediate file name from the template
							// //and join it with the output directory to create the full
							// //file path
							// const intermediateFileName = path.join(outputDirectory,
								// S(this.intermediateFileTemplate).template({ chunkNum }).s);
						
							// //Write the chunk to the intermediate file
							// fileIO.writeChunkToFile(chunk, intermediateFileName);
							
							// //Add the intermediate file name to our list of intermediate
							// //files
							// intermediateFiles.push(intermediateFileName);
							
							// //Emit a chunk event
							// this.emit('chunk', chunkNum);
						// });

					// //When we've finished processing the chunk stream, resolve the promise
					// //with the list of intermediate files
					// chunkStream.onEnd(() => {
						// resolve(intermediateFiles);
					// });
				// });	
			});
	}
	
	createNumberStream(inputFiles) {
	}
}

module.exports = SortedFilesMerger;
