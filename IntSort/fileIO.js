const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const commonFileIO = require('../common/fileIO');
const readline = require('readline');
const Bacon = require('baconjs');
const createPausableStream = require('bacon-pausable-stream');
const createAutoPauseLineStream = require('bacon-node-autopause-line-stream');

/**
 * Creates a stream that emits chunks of integers read from a file.
 *
 * If a chunk size of 100 is specified, the Bacon stream will read 
 * 100 integers will be read at a time from the file stream and 
 * emit them in the form of an array.
 *
 * The stream automatically pauses itself after it emits an event, and can
 * be resumed by calling the resume() function property in the objectevent
 * emitted by the event. 
 *
 * The object emitted by the event contains two properties: chunk, which
 * contains the chunk being emitted, and resume, which contains a function
 * that will resume the chunk stream when called.
 *
 * @param fileReadStream - A read stream for a file containing integers
 *	on each line
 * @param chunkSize - The size (in number of integers) of each chunk of 
 * 	integers to be read from the file. This function assumes that 
 * 	chunkSize > 0.
 * @returns a Bacon stream that emits chunks of integers
 */
function createAutoPauseIntegerChunkStream(fileReadStream, chunkSize) {
	//Create a autopause bacon line stream
	const lineStream = createAutoPauseLineStream(fileReadStream);

	return Bacon.fromBinder(function(sink) {
		//Keep track of how many lines have been read for the current
		//chunk
		let lineCount = 0;
		let currentChunk = [];
			
		//Set an event handler for the error events
		lineStream.onError(error => sink(new Bacon.Error(error)));
		
		//Set an event handler for the line event
		lineStream.onValue(({line, resume}) => {
			const integerString = line;
			
			//Convert the current integer string to an integer and add the
			//integer to the current chunk
			currentChunk.push(parseInt(integerString));
			
			lineCount++;
			
			//Check if the entire chunk has been read, and if so, emit
			//the chunk
			if(lineCount === chunkSize) {
				//Emit the chunk
				sink({
					chunk: currentChunk, 
					resume
				});
				
				//Reset the line count
				lineCount = 0;
				
				//Clear the chunk and allocate some different memory for
				//the new chunk so that whatever is using the old chunk isn't
				//surprised by the chunk being overwritten
				currentChunk = [];
			}
			else {
				//If the chunk has not been completed, resume the stream
				resume();
			}
		});
		
		//Set an event handler for the close event, which indicates
		//that we've read all the integers
		lineStream.onEnd(() => {
			//Emit the current chunk (if it contains any data) and then 
			//indicate that we've reached the end of the Bacon stream
			if(currentChunk.length > 0) {
				sink({
					chunk: currentChunk, 
					resume: () => {}
				});
			}
			
			sink(new Bacon.End());
		});
		
		return () => {};
	});
}

/**
 * Creates a stream that emits integers read from a file
 *
 * @param fileReadStream - A read stream for a file containing integers
 *	on each line
 * @returns a Bacon stream that emits integers
 */
function createIntegerStream(fileReadStream) {
	const rlIntegers = readline.createInterface({
		input: fileReadStream
	});
	
	return Bacon.fromBinder(function(sink) {
		//Set an event handler for the error events
		fileReadStream.on('error', error => sink(new Bacon.Error(error)));
		rlIntegers.on('error', error => sink(new Bacon.Error(error)));
		
		//Set an event handler for the line event
		rlIntegers.on('line', integerString => {
			//Convert the integer from a string to a number
			const integerNumber = parseInt(integerString);
			
			//Emit the number
			sink(integerNumber);
		});
		
		//Set an event handler for the close event, which indicates
		//that we've read all the integers
		rlIntegers.on('close', () => {
			//Indicate that we've reached the end of the Bacon stream
			sink(new Bacon.End());
		});
		
		return () => {};
	});
}

/**
 * Deletes one or more files
 *
 * @param {string[]} files - An array containing the paths of all the files to be
 *	deleted
 * @returns {object} A promise that resolves when all files have been deleted
 */
function deleteFiles(files) {
	const deletePromises = files.map(file => fs.unlinkAsync(file));
	
	return Promise.all(deletePromises);
}

/**
 * Indicates whether a file exists
 *
 * @param fileName - The path and name of a file
 * @returns a promise that resolves to true if the file exists, 
 * 	false if the file does not exist
 */
function fileExists(fileName) {
	return fs.statAsync(fileName)
		.then(stats => {
			let fileExists = false;
			
			if(stats.isFile()) {
				fileExists = true;
			}
			
			return fileExists;
		})
		.catch(error => false);
}

/**
 * Writes a chunk of integers to a file
 *
 * Any existing file will be overwritten
 *
 * @param fileName - The path and name of a file
 * @returns a promise that resolves to true if the file exists, 
 * 	false if the file does not exist
 */
function writeChunkToFile(chunk, fileName) {
	//Ensure the file path exists
	return fileIO.ensureFilePathExists(fileName)
		.then(() => {
			return new Promise((resolve, reject) => {
				//console.log("open ", fileName);
				
				//Open the output file
				const fileStream = fileIO.createWriteableFileStream(fileName);

				//Set up a file stream error handler
				fileStream.on('error', error => reject(error));

				//Create a pausable stream of chunk values
				function* generateChunkStream(chunk) {
					for(integer of chunk) {
						yield integer;
					}
					
					return new Bacon.End();
				}
				
				const chunkValuesStream = createPausableStream(generateChunkStream(chunk));
				
				//Set up a processing pipeline
				const processedChunkStream = chunkValuesStream
					//Convert the integer to a string
					.map(integerValue => integerValue.toString())
					//Add a newline character to the string
					.map(integerString => integerString + '\n');
					
				//Write the result to the output file					
				processedChunkStream.onValue(line => {
					const continueWriting = fileStream.write(line);
					
					if(!continueWriting) {
						//If the write stream buffer is full, pause and wait for
						//the buffer to drain
						chunkValuesStream.pause();
						
						fileStream.once('drain', chunkValuesStream.resume);
					}
				});
					
				//Set up an error handler for the pipeline
				processedChunkStream.onError(error => reject(error));
				
				//When the chunks have been processed and written,
				//close the file and resolve the promise
				processedChunkStream.onEnd(() => {
					//Resolve the promise once the file has been closed
					fileStream.once('close', () => {
						//console.log("close ", fileName);
						
						resolve();
					});
					
					//Flush the data and close the file
					fileStream.end();
				});				
			});

		});
}

const fileIO = {
	createAutoPauseIntegerChunkStream,
	createIntegerStream,
	createWriteableFileStream: commonFileIO.createWriteableFileStream,
	deleteFiles,
	ensureDirectoryExists: commonFileIO.ensureDirectoryExists,
	ensureFilePathExists: commonFileIO.ensureFilePathExists,
	fileExists,
	writeChunkToFile
};

module.exports = fileIO;
