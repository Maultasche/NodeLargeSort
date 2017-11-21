const Promise = require('bluebird');

const fs = Promise.promisifyAll(require('fs'));
const fileIO = require('./fileIO');
const sort = require('./sort');
const commandLine = require('./commandLine');
const S = require('string');

const args = commandLine.parseCommandLineArgs(process.argv);

//Handle any missing arguments
if(commandLine.missingArgs(args)) {
	commandLine.outputMissingArgs(args);
}
else {
	//Ensure the file path exists and then do the work of generating the random integers
	// fileIO.ensureFilePathExists(args.file)
		// .then(() => generateIntegersToFile(args.count, args.file, args.lowerBound, 
			// args.upperBound));
			
	console.log('Input File: ', args.inputFile);
	console.log('Output File: ', args.outputFile);
	console.log('Chunk Size: ', args.chunkSize);
	console.log('Keep Intermediate: ', args.keepIntermediate);
	
	//Create the file name
	const genFileName = 'gen1-{{chunkNum}}';
	
	//Create the sorted chunk files (Gen 1 files) from the input file
	createSortedChunkFiles(args.inputFile, args.chunkSize, genFileName)
		.catch(error => console.error(error));
}

/**
 * Reads in chunks of integers from an input file, sorts each chunk, and then
 * writes each sorted chunk to Gen 1 output files
 *
 * Any existing files with the same name will be overwritten.
 *
 * @param input file - The file to read from
 * @param chunkSize - The number of integers that can be read as part of a chunk
 * @param genFileName - A file name template string to use to create the Gen 1
 *	 intermediate files.
 * @return a promise that is resolved when the sorted chunk files have been created
 */
function createSortedChunkFiles(inputFile, chunkSize, genFileName) {
	return new Promise((resolve, reject) => {
		//Create the readable file stream
		const readStream = fs.createReadStream(inputFile);
		const chunkStream = fileIO.createIntegerChunkStream(readStream, chunkSize);
		
		chunkStream.onError(error => reject(error));
		
		
		
		chunkStream.onValue(chunk => console.log(chunk));		
	});
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

// /**
 // * Handles a file error that occurs during file write operations
 // *
 // * @param error - The error that occurred
 // * @param fileName - The path and name of the file that was involved in the error
 // */
// function handleFileError(error, fileName) {
	// console.error(`An error occurred when writing to ${fileName}: ${error.message}`);
// }




