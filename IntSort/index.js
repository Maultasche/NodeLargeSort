const Promise = require('bluebird');

const fs = Promise.promisifyAll(require('fs'));
const fileIO = require('./fileIO');
const sort = require('./sort');
const commandLine = require('./commandLine');
const S = require('string');
const ChunkFilesCreator = require('./chunkFilesCreator');

const args = commandLine.parseCommandLineArgs(process.argv);

//Handle any missing arguments
if(commandLine.missingArgs(args)) {
	commandLine.outputMissingArgs(args);
}
else {
	//Create the intermediate file name template
	const genFileName = 'gen1-{{chunkNum}}.txt';
	
	console.log('Input File: ', args.inputFile);
	console.log('Output File: ', args.outputFile);
	console.log('Chunk Size: ', args.chunkSize);
	console.log('Keep Intermediate: ', args.keepIntermediate);
	
	//Verify that the input file exists
	const fileExistsPromise = fileIO.fileExists(args.inputFile).catch(handleError);
	
	fileExistsPromise
		//Determine whether the input file exists and handle the result
		.then(fileExists => {
			if(!fileExists) {
				return Promise.reject(
					`The input file "${args.inputFile}" does not exist`);
			}
			else {
				return Promise.resolve();
			}
		})
		//Process the input file
		.then(() => processInputFile(args.inputFile, args.chunkSize, 
			genFileName))
		//Process the intermediate files
		.then(() => {})
		//Handle any errors that occur
		.catch(handleError);

	
	//Ensure the file path exists and then do the work of generating the random integers
	// fileIO.ensureFilePathExists(args.file)
		// .then(() => generateIntegersToFile(args.count, args.file, args.lowerBound, 
			// args.upperBound));
			

}

/**
 * Processes the input file and produces Gen1 intermediate files
 *
 * @param {string} inputFile - The name the input file. This function assumes that the
 *	input file exists
 * @param {number} chunkSize - The chunk size
 * @param {string} genFileName - The string template that describes the format
 *	of the intermediate files
 * @returns {string[]} A promise that resolves to an array containing the names 
 *	of the intermediate files that were generated
 */
function processInputFile(inputFile, chunkSize, genFileName) {
	//Construct the chunk files creator
	chunkFilesCreator = new ChunkFilesCreator(inputFile, chunkSize, genFileName);
		
	//Create the sorted chunk files (Gen 1 files) from the input file
	return chunkFilesCreator.processChunks(genFileName);	
}

/**
 * Handles any error that occurs
 *
 * @param error - Information regarding the error that occurred
 */
function handleError(error) {
	console.log(error);
}




