const Promise = require('bluebird');

const fileIO = require('./fileIO');
const numberGen = require('./numberGen');
const commandLine = require('./commandLine');

const args = commandLine.parseCommandLineArgs(process.argv);

//Handle any missing arguments
if(commandLine.missingArgs(args)) {
	commandLine.outputMissingArgs(args);
}
else {
	//Ensure the file path exists and then do the work of generating the random integers
	fileIO.ensureFilePathExists(args.file)
		.then(() => generateIntegersToFile(args.count, args.file, args.lowerBound, 
			args.upperBound));
}

/**
 * Randomly generates a specified number of integers within a specified range
 * and writes them to a text file, with each integer on its own line
 *
 * Any existing file with the same name will be overwritten.
 *
 * @param integerCount - The number of integers to generate
 * @param fileName - The path and name of the file to write to
 * @param lowerBound - The lower bound (inclusive) of the range in which
 *	integers are to be generated
 * @param upperBound - The upper bound (inclusive) of the range in which
 *	integers are to be generated
 */
function generateIntegersToFile(integerCount, fileName, lowerBound, upperBound) {
	//Open the output file
	const fileStream = fileIO.createWriteableFileStream(args.file);

	//Add an error handler
	fileStream.on('error', error => handleFileError(error, args.file));

	//Create the random integer stream
	const randomIntegerStream = numberGen.createRandomIntegerStream(integerCount, 
		lowerBound, upperBound);
		
	//Transform the integers to a string, add a new line, and then write them to the file
	randomIntegerStream
		.map(randomInteger => randomInteger.toString())
		.map(integerString => integerString + '\n')
		.onValue(lineString => fileStream.write(lineString));
		
	//Close the file stream
	fileStream.end();
}

/**
 * Handles a file error that occurs during file write operations
 *
 * @param error - The error that occurred
 * @param fileName - The path and name of the file that was involved in the error
 */
function handleFileError(error, fileName) {
	console.error(`An error occurred when writing to ${fileName}: ${error.message}`);
}




