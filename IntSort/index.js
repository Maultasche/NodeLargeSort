const Promise = require('bluebird');

const fs = Promise.promisifyAll(require('fs'));
const fileIO = require('./fileIO');
const path = require('path');
const commandLine = require('./commandLine');
const ChunkFilesCreator = require('./chunkFilesCreator');
const progress = require('cli-progress');
const args = commandLine.parseCommandLineArgs(process.argv);

//Handle any missing arguments
if(commandLine.missingArgs(args)) {
	commandLine.outputMissingArgs(args);
}
else {
	//Create the intermediate file name template
	const genFileName = 'gen1-{{chunkNum}}.txt';
	
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
		//Determine how many chunks are in the input file
		.then(() => {
			console.log('Calculating the number of chunks in the input file...');
			
			return calculateNumberOfChunks(args.inputFile, args.chunkSize);
		})
		//Process the input file
		.then(numberOfChunks => {
			const outputDirectory = path.dirname(args.outputFile);
			
			processInputFile(args.inputFile, args.chunkSize, numberOfChunks, 
				outputDirectory, genFileName);
		})
		//Process the intermediate files
		.then(intermediateFiles => {})
		//Handle any errors that occur
		.catch(handleError);
}

/**
 * Calculates the number of chunks of integers in the input file
 *
 * @param {string} inputFile - The name the input file. This function assumes that the
 *	input file exists
 * @param {number} chunkSize - The chunk size
 * @returns {string[]} A promise that resolves to the number of integer chunks in the
 *	input file
 */
function calculateNumberOfChunks(inputFile, chunkSize) {
	return new Promise((resolve, reject) => {
		//Create a readable file stream
		const readStream = fs.createReadStream(inputFile);

		//Create the chunk stream from the readable file stream
		const chunkStream = fileIO.createIntegerChunkStream(readStream, 
			chunkSize);

		//Set up an error handler
		chunkStream.onError(error => reject(error));
		
		//Count the number of chunks in the chunk stream
		chunkStream.reduce(0, (total, chunk) => total + 1)
			.onValue(total => resolve(total));
	});
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
function processInputFile(inputFile, chunkSize, numberOfChunks, outputDirectory, 
	genFileName) {
		
	//Create a progress bar to show the current state of chunk processing
	const progressBarFormat = 'Sorting Chunks {bar} | {percentage}% | {value}/{total}';
	const progressBar = new progress.Bar({ format: progressBarFormat },
		progress.Presets.shades_classic);
				
	//Construct the chunk files creator
	chunkFilesCreator = new ChunkFilesCreator(inputFile, chunkSize, genFileName);

	//Add a 'chunk' event handler so that we can update the progress bar
	chunkFilesCreator.on('chunk', chunkNum => progressBar.update(chunkNum));
			
	//Start the progress bar
	progressBar.start(numberOfChunks, 0);
	
	//Create the sorted chunk files (Gen 1 files) from the input file
	return chunkFilesCreator.processChunks(outputDirectory)
		.finally(() => progressBar.stop());	
}

/**
 * Handles any error that occurs
 *
 * @param error - Information regarding the error that occurred
 */
function handleError(error) {
	console.log(error);
}




