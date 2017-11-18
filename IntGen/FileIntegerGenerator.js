/**
 * Contains a file integer generation class, which will generate random integers
 * and write them to a file
 */
 
const EventEmitter = require('events');
const fileIO = require('./fileIO');
const numberGen = require('./numberGen');

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
	 */
	writeToFile(integerCount, fileName) {
		//Open the output file
		const fileStream = fileIO.createWriteableFileStream(fileName);

		//Add an error handler that emits an error event
		fileStream.on('error', error => this.emit('error', error));

		//Create the random integer stream
		const randomIntegerStream = numberGen.createRandomIntegerStream(integerCount, 
			this.lowerBound, this.upperBound);
			
		//Transform the integers to a string, add a new line, and then write them to the file
		randomIntegerStream
			.map(randomInteger => randomInteger.toString())
			.map(integerString => integerString + '\n')
			.onValue(lineString => {
				//Write the integers string to the file
				fileStream.write(lineString)
				
				//Emit an 'integer' event
				this.emit('integer', parseInt(lineString));
			});
			
		//Close the file stream
		fileStream.end();		
		
		//Emit the 'end' event
		this.emit('end');
	}
}

module.exports = FileIntegerGenerator;
