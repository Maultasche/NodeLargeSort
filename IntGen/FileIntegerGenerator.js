/**
 * Contains a file integer generation class, which will generate random integers
 * and write them to a file
 */
 
const EventEmitter = require('events');
const fileIO = require('./fileIO');
const numberGen = require('./numberGen');
const Bacon = require('baconjs');

class FileIntegerGenerator extends EventEmitter {
	/**
	 * Constructs a file integer generator
	 *
	 * @param lowerBound - The lower bound (inclusive) of the range in which
	 *	integers are to be generated
	 * @param upperBound - The upper bound (inclusive) of the range in which
	 *	integers are to be generated
	 */	
	constructor(lowerBound, upperBound) {
		super();
		
		this.lowerBound = lowerBound;
		this.upperBound = upperBound;
	}
	
	/**
	 * Starts generating integers within the specified bounds and writes
	 * them to a file.
	 *
	 * Any existing file with the same name will be overwritten.
	 *
	 * The following events will be emitted:
	 * - 'integer': emitted when an integer is generated and written to the file
	 * - 'end': emitted when all the integers have been generated and written
	 *	to the file
	 * - 'error': emitted when an error has been encountered
	 * @param integerCount - The number of integers to generate
	 * @param fileName - The path and name of the file to write to
	 * @param lowerBound - The lower bound (inclusive) of the range in which
	 *	integers are to be generated
	 * @param upperBound - The upper bound (inclusive) of the range in which
	 *	integers are to be generated
	 * @returns a promise that resolves when the integers have been written
	 *	and the file has been closed
	 */
	writeToFile(integerCount, fileName) {
		return new Promise((resolve, reject) => {
			//Open the output file
			const fileStream = fileIO.createWriteableFileStream(fileName);

			//Add an error handler that emits an error event
			fileStream.on('error', error => reject(error));

			//Create the random integer stream
			const randomIntegerStream = numberGen.createRandomIntegerStream(integerCount, 
				this.lowerBound, this.upperBound);
			
			//When the file stream emits a 'drain' event, it's internal buffer is now empty.
			//So we can resume generating random integers and writing them to the file stream.
			fileStream.on('drain', randomIntegerStream.resume);
			
			//Transform the integers to a string, add a new line, and then write them to the file
			randomIntegerStream
				.map(randomInteger => randomInteger.toString())
				.map(integerString => integerString + '\n')
				.onValue(lineString => {
					//Write the integers string to the file
					const canContinueWriting = fileStream.write(lineString)
					
					//If the write() operation returns a false, it means that the file stream's
					//internal buffer is full. We'll need to pause the random integer stream
					//so that the file stream has a chance to drain its buffer. If we don't do
					//this, random integers are generated faster than they can be written to
					//the file, and large numbers of random integers will be buffered in memory,
					//gobbling up enormous amounts of memory.
					if(!canContinueWriting) {
						randomIntegerStream.pause();
					}
					
					//Emit an 'integer' event
					this.emit('integer', parseInt(lineString));
				});

			//We'll need to clean things up when the integer stream ends
			randomIntegerStream.onEnd(() => {
				//Close the file stream
				fileStream.end();		
				
				//Resolve the promise
				resolve();				
			});			
		});
	}
}

module.exports = FileIntegerGenerator;
