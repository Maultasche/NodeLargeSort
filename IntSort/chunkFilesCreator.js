/**
 * Contains a chunk file creator class, which will read in chunks of integers
 * from an input file, sort the chunks, and them write them to interediate
 * chunk files.
 */
 
const Promise = require('bluebird');
const EventEmitter = require('events');
const fs = Promise.promisifyAll(require('fs'));
const fileIO = require('./fileIO');
const S = require('string');
const path = require('path');

class ChunkFilesCreator extends EventEmitter {
	/**
	 * Constructs a chunk files creator
	 *
	 * A chunk files creator reads in a chunk of integers from an input file,
	 * sorts the chunk, and then writes the chunk to an intermediate file.
	 * Only a single chunk of integers will be in memory at any particular time.
	 *
	 * @param inputFile - The file to read integers from
	 * @param chunkSize - The number of integers that comprise a chunk
	 * @param intermediateFileTemplate - The file template to use in creating
	 *	intermediate files. The 'chunkNum' template parameter represents
	 * 	the number of the chunk that is being written to a file
	 */	
	constructor(inputFile, chunkSize, intermediateFileTemplate) {
		super();
		
		this.inputFile = inputFile;
		this.chunkSize = chunkSize;
		this.intermediateFileTemplate = intermediateFileTemplate;
	}
	
	/**
	 * Starts reading chunks of integers from the input file and writing
	 * them to intermediate files
	 *
	 * Any existing intermediate files with the same names will be overwritten.
	 *
	 * The following events will be emitted:
	 * - 'chunk': emitted when a chunk is read, sorted, and written to an
	 *	intermediate file. The chunk number (starting from 1 for the first chunk)
	 * 	is passed to the event handler.
	 *
	 * @param {string} outputDirectory - The directory where the intermediate files
	 *	will be written
	 * @returns {string[]} a promise that resolves to an array containing the names
	 * 	of the intermediate files that were generated
	 */
	processChunks(outputDirectory) {
		//Ensure that the output directory exists
		return fileIO.ensureDirectoryExists(outputDirectory)
			.then(() =>	{
				return new Promise((resolve, reject) => {
					//Create the readable file stream
					const readStream = fs.createReadStream(this.inputFile);

					//Create the chunk stream from the readable file stream
					const chunkStream = fileIO.createIntegerChunkStream(readStream, 
						this.chunkSize);
					
					//Set the error handler
					chunkStream.onError(error => reject(error));

					const intermediateFiles = [];
					
					let chunkNum = 0;
					
					//Set up the chunk processing pipeline			
					chunkStream
						//Sort the chunk numerically
						.map(chunk => {
							chunk.sort((a, b) => a - b);
							
							return chunk;
						})
						//Write the sorted chunk to a file
						.onValue(chunk => {
							chunkNum++;
							
							//Create the intermediate file name from the template
							//and join it with the output directory to create the full
							//file path
							const intermediateFileName = path.join(outputDirectory,
								S(this.intermediateFileTemplate).template({ chunkNum }).s);
						
							//Write the chunk to the intermediate file
							fileIO.writeChunkToFile(chunk, intermediateFileName);
							
							//Add the intermediate file name to our list of intermediate
							//files
							intermediateFiles.push(intermediateFileName);
							
							//Emit a chunk event
							this.emit('chunk', chunkNum);
						});

					//When we've finished processing the chunk stream, resolve the promise
					//with the list of intermediate files
					chunkStream.onEnd(() => {
						resolve(intermediateFiles);
					});
				});	
			});
	}
}

module.exports = ChunkFilesCreator;
