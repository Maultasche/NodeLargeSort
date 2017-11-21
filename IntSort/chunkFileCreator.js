/**
 * Contains a chunk file creator class, which will read in chunks of integers
 * from an input file, sort the chunks, and them write them to interediate
 * chunk files.
 */
 
const EventEmitter = require('events');
const fileIO = require('./fileIO');

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
	 * 	the number of the chunk that is being writte n to a file
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
	 *	intermediate file
	 * - 'end': emitted when all the chunks have been processed
	 * - 'error': emitted when an error has been encountered
	 * @param integerCount - The number of integers to generate
	 * @param fileName - The path and name of the file to write to
	 * @param lowerBound - The lower bound (inclusive) of the range in which
	 *	integers are to be generated
	 * @param upperBound - The upper bound (inclusive) of the range in which
	 *	integers are to be generated
	 * @returns a promise that is resolved when the chunk processing has
	 *	completed
	 */
	processChunks() {
		return new Promise((resolve, reject) => {
			//Create the readable file stream
			const readStream = fs.createReadStream(inputFile);
			const chunkStream = fileIO.createIntegerChunkStream(readStream, chunkSize);
			
			//Set the error handler
			chunkStream.onError(error => this.emit('error', error));
			
			//Set up the chunk processing pipeline
			
			
			chunkStream.onValue(chunk => console.log(chunk));

			//When we've finished processing the chunk stream, resolve the promise
			//and emit an 'end' event
			chunkStream.onEnd(() => {
				this.emit('end');
				
				resolve();
			});
		});		
		// //Open the output file
		// const fileStream = fileIO.createWriteableFileStream(fileName);

		// //Add an error handler that emits an error event
		// fileStream.on('error', error => this.emit('error', error));

		// //Create the random integer stream
		// const randomIntegerStream = numberGen.createRandomIntegerStream(integerCount, 
			// this.lowerBound, this.upperBound);
			
		// //Transform the integers to a string, add a new line, and then write them to the file
		// randomIntegerStream
			// .map(randomInteger => randomInteger.toString())
			// .map(integerString => integerString + '\n')
			// .onValue(lineString => {
				// //Write the integers string to the file
				// fileStream.write(lineString)
				
				// //Emit an 'integer' event
				// this.emit('integer', parseInt(lineString));
			// });
			
		// //Close the file stream
		// fileStream.end();		
		
		// //Emit the 'end' event
		// this.emit('end');
	}
}

module.exports = FileIntegerGenerator;
