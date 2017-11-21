const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const commonFileIO = require('../common/fileIO');
const readline = require('readline');
const Bacon = require('baconjs');

/**
 * Creates a stream that emits chunks of integers read from a file
 *
 * If a chunk size of 100 is specified, the Bacon stream will read 
 * 100 integers will be read at a time from the file stream and 
 * emit them in the form of an array.
 *
 * @param fileReadStream - A read stream for a file containing integers
 *	on each line
 * @param chunkSize - The size (in number of integers) of each chunk of 
 * 	integers to be read from the file. This function assumes that 
 * 	chunkSize > 0.
 * @returns a Bacon stream that emits chunks of integers
 */
function createIntegerChunkStream(fileReadStream, chunkSize) {
	const rlIntegers = readline.createInterface({
		input: fileReadStream
	});
	
	return Bacon.fromBinder(function(sink) {
		//Keep track of how many lines have been read for the current
		//chunk
		let lineCount = 0;
		let currentChunk = [];
		
		//Set an event handler for the line event
		rlIntegers.on('line', integerString => {
			//Convert the current integer string to an integer and add the
			//integer to the current chunk
			currentChunk.push(parseInt(integerString));
			
			lineCount++;
			
			//Check if the entire chunk has been read, and if so, emit
			//the chunk
			if(lineCount === chunkSize) {
				//Pause the line reader
				rlIntegers.pause();
				
				//Emit the chunk
				sink(currentChunk);
				
				//Reset the line count
				lineCount = 0;
				
				//Clear the chunk and allocate some different memory for
				//the new chunk so that whatever is using the old chunk isn't
				//surprised by the chunk being overwritten
				currentChunk = [];
				
				//Resume the line reader
				rlIntegers.resume();
			}
		});
		
		//Set an event handler for the close event, which indicates
		//that we've read all the integers
		rlIntegers.on('close', () => {
			//Emit the current chunk (if it contains any data) and then 
			//indicate that we've reached the end of the Bacon stream
			if(currentChunk.length > 0) {
				sink(currentChunk);
			}
			
			sink(new Bacon.End());
		});
		
		return () => {};
	});
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
	return fileIO.ensureFilePathExists(args.file)
		.then(() => {
			return new Promise((resolve, reject) => {
				//Open the output file
				const fileStream = fileIO.createWriteableFileStream(fileName);

				//Set up a file stream error handler
				fileStream.on('error', error => reject(error));
				
				//Create a stream of chunk values
				const chunkValuesStream = Bacon.fromArray(chunk);

				//Set up a processing pipeline
				const processedChunkStream = chunkValuesStream
					//Convert the integer to a string
					.map(integerValue => integerValue.toString())
					//Add a newline character to the string
					.map(integerString => integerString + '\n')
					//Write the result to the output file
					.onValue(line => fileStream.write(line));
				
				//Set up an error handler for the pipeline
				processedChunkStream.onError(error => reject(error));
				
				//When the chunks have been processed and written,
				//close the file and resolve the promise
				processedChunkStream.onEnd(() => {
					fileStream.end();
					
					resolve();					
				});				
			});

		});
}

const fileIO = {
	createIntegerChunkStream,
	createWriteableFileStream: commonFileIO.createWriteableFileStream,
	ensureFilePathExists: commonFileIO.ensureFilePathExists,
	fileExists
};

module.exports = fileIO;
