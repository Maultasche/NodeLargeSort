const Promise = require('bluebird');

const fs = Promise.promisifyAll(require('fs'));
const fileIO = require('./fileIO');
const path = require('path');
const commandLine = require('./commandLine');
const ChunkFilesCreator = require('./chunkFilesCreator');
const SortedFilesMerger = require('./sortedFilesMerger');
const progress = require('cli-progress');
const S = require('string');
const args = commandLine.parseCommandLineArgs(process.argv);
const _ = require('lodash');


//Handle any missing arguments
if(commandLine.missingArgs(args)) {
	commandLine.outputMissingArgs(args);
}
else {
	//Create the intermediate file name template
	const genFileName = 'gen{{genNum}}-{{chunkNum}}.txt';
	
	//Obtain the output directory
	const outputDirectory = path.dirname(args.outputFile);
		
	//Verify that the input file exists		
	fileIO.fileExists(args.inputFile)		
		//Handle the result
		.then(fileExists => {
			if(!fileExists) {
				return Promise.reject(
					`The input file "${args.inputFile}" does not exist`);
			}
			else {
				return Promise.resolve();
			}
		})
		//Determine how many integers are in the input file
		.then(() => {
			console.log('Calculating the number of integers in the input file...');
			return calculateNumberOfIntegers(args.inputFile);
		})
		//Determine how many chunks of integers are in the input file using the chunk
		//size from the program arguments
		.then(integerCount => {
			const numberOfChunks = Math.ceil(integerCount / args.chunkSize);
			
			console.log("Number of chunks: ", numberOfChunks);
			
			return ({numberOfChunks, integerCount});
			//return calculateNumberOfChunks(args.inputFile, args.chunkSize);
		})
		//Process the input file, reading in a chunk at a time, sorting the chunk,
		//and writing the chunk to its own intermediate file
		.then(({ numberOfChunks, integerCount }) => {
			const gen1FileTemplate = S(genFileName)
				.template({ genNum: 1, chunkNum: '{{chunkNum}}' }).s;
			
			return processInputFile(args.inputFile, args.chunkSize, numberOfChunks, 
				outputDirectory, gen1FileTemplate).
				then(intermediateFiles => ({intermediateFiles, integerCount}));
		})
		//Merge the intermediate files
		.then(({intermediateFiles, integerCount}) => {
			console.log(`${intermediateFiles.length} Gen 1 intermediate files were generated`);
			
			//The maximum number of files to merge at once
			const mergeFileCount = 10;
			
			return mergeAllIntermediateFiles(intermediateFiles, args.keepIntermediate,
				2, mergeFileCount, outputDirectory, genFileName, integerCount);
		})
		//Rename the final merged intermediate file to the specified output file
		.then(intermediateFile => {
			return fs.renameAsync(intermediateFile, args.outputFile)
				.then(() => console.log("Output File: ", args.outputFile));
		})
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
 * Merges all intermediate files into a set of output files, recursively
 * calling itself (via promise chaining) until only a single output file remains.
 *
 * The number of output files depends on the number of intermediate files and
 * the merge file count. If there are 200 intermediate files and the merge file
 * count is 10, then intermediate files will be merged in groups of 10, resulting
 * in 20 output files. Those output files can in turn be merged in the next 
 * generation of merges by calling this function again.
 *
 * @param {string[]} intermediateFiles - The names of the intermediate files to
 *	be merged
 * @param {boolean} deleteIntermediateFiles - true if intermediate files are to be
 *	deleted as soon as they are merged, otherwise false
 * @param {number} genNumber - The merge generation number
 * @param {number} mergeFileCount - The number of intermediate files to be merged
 *	into a single output file
 * @param {string} outputDirectory - The directory where the output file is 
 *	to be written
 * @param {string} genFileTemplate - The template used to construct the output file
 *	name. This template must have a {{gen}} parameter and a {{chunkNum}} parameter.
 * @param {number} integerCount - The number of integers being sorted and merged
 * @returns {Object} A promise that resolves to an array containing the names 
 *	of the merged output files or a single output file when there is only one
 *	output file remaining
 */
function mergeAllIntermediateFiles(intermediateFiles, keepIntermediateFiles, 
	genNumber, mergeFileCount, outputDirectory, genFileTemplate, integerCount) {
	//Insert the generation number into the file template to produce the file
	//template for the current generation of file merging
	currentGenerationFileTemplate = S(genFileTemplate)
				.template({ genNum: genNumber, chunkNum: '{{chunkNum}}' }).s;
	
	return mergeIntermediateFilesSet(intermediateFiles, genNumber, mergeFileCount,
		outputDirectory, currentGenerationFileTemplate, integerCount)
		.then(outputFiles => {
			//TODO: if keepIntermediateFiles === false, delete the intermediate files
			//return fileIO.deleteFiles(intermediateFiles).then(() => outputFiles);
			return outputFiles;
		})
		.then(outputFiles => {
			if(outputFiles.length === 1) {
				console.log(`Gen ${genNumber - 1} files were merged into a single output file`);
				return outputFiles[0];
			}
			else {
				console.log(`Gen ${genNumber - 1} files were merged into ${outputFiles.length} ` +
					`Gen ${genNumber} intermediate files`);
				
				return mergeAllIntermediateFiles(outputFiles, keepIntermediateFiles,
					genNumber + 1, mergeFileCount, outputDirectory, genFileTemplate,
					integerCount);
			}
		});	
}

/**
 * Merges a single set of intermediate files into one or more output files.
 *
 * The number of output files depends on the number of intermediate files and
 * the merge file count. If there are 200 intermediate files and the merge file
 * count is 10, then intermediate files will be merged in groups of 10, resulting
 * in 20 output files. Those output files can in turn be merged in the next 
 * generation of merges by calling this function again.
 *
 * @param {string[]} intermediateFiles - The names of the intermediate files to
 *	be merged
 * @param {number} genNumber - The merge generation number
 * @param {number} mergeFileCount - The number of intermediate files to be merged
 *	into a single output file
 * @param {string} outputDirectory - The directory where the output file is 
 *	to be written
 * @param {string} genFileTemplate - The template used to construct the output file
 *	name. This template must have a {{chunkNum}} parameter.
 * @param {number} integerCount - The number of integers being sorted and merged 
 * @returns {Object} A promise that resolves to an array containing the names 
 *	of the merged output files
 */
function mergeIntermediateFilesSet(intermediateFiles, genNumber, mergeFileCount,
	outputDirectory, genFileTemplate, integerCount) {
	
	//Create a progress bar to show the current state of file merging for this merge generation
	const progressBarFormat = `Merging Gen ${genNumber - 1} intermediate files ` +
		`{bar} | {percentage}% | {value}/{total}`;
	const progressBar = new progress.Bar({ format: progressBarFormat },
		progress.Presets.shades_classic);
	
	//We are dividing the merge process into chunks, where each chunk involves
	//X files being merged into an output file, where X is mergeFileCount
	//This ensures that only X number of integers are in memory at any particular
	//time.
	
	//Divide the intermediate files into chunks of size mergeFileCount and
	//create the file merger objects for each chunk
	return Promise.all(_.chunk(intermediateFiles, mergeFileCount)
		.map((fileChunk, index) => {
			const outputFile = S(genFileTemplate)
				.template({ chunkNum: index + 1 }).s;
			
			return createIntermediateFilesMerger(fileChunk, outputDirectory,
				outputFile);
		}))
		.then(mergerItems => {			
			//Extract the intermediate file mergers
			const intermediateFileMergers = mergerItems
				.map(mergerItem => mergerItem.fileMerger);
				
			//Extract the output files
			const outputFiles = mergerItems
				.map(mergerItem => mergerItem.outputFile);
		
			//Start the progress bar
			progressBar.start(integerCount, 0);
			
			//Keep track of the number of sorted integers merged
			let sortedIntegersMergeCount = 0;
			
			//Handle the 'integer' events generated by the intermediate file mergers
			intermediateFileMergers
				.forEach(fileMerger => fileMerger.on('integer', () => {
					//Increment the number of sorted integers merged and update the
					//progress bar
					sortedIntegersMergeCount++;
					
					progressBar.update(sortedIntegersMergeCount);
				}));
			
			//Start merging the intermediate files, and when done, return a promise
			//containing the output files
			return Promise.all(intermediateFileMergers
				.map(fileMerger => fileMerger.mergeSortedFiles()))
				.then(() => outputFiles)
				.finally(() => progressBar.stop());
		});
}	


/**
 * Creates a sorted files merger for a group of intermediate files
 *
 * @param {string[]} intermediateFiles - The names of the intermediate files to
 *	be merged
 * @param {string} outputDirectory - The directory where the output file is 
 *	to be written
 * @param {string} outputFile - The name of the output file where the merged
 *	result is to be written
 * @returns {Object} A promise that resolves to an object containing the 
 * 	sorted files merger object that will do the work of merging the 
 *	intermediate files and the output file it will write to
 */
function createIntermediateFilesMerger(intermediateFiles, outputDirectory, 
	outputFile) {
	//Ensure the output directory exists
	return fileIO.ensureDirectoryExists(outputDirectory)
		.then(() => {
			//Create readable streams for the intermediate fileSize
			const intermediateFileStreams = intermediateFiles
				.map(fileName => fs.createReadStream(fileName));			
			
			//Map the output file name to a file path
			const outputFilePath = path.resolve(outputDirectory, outputFile);
			
			//Create the writeable stream for the output file
			const outputFileStream = fileIO.createWriteableFileStream(outputFilePath);
			
			//Create the files merger
			intermediateFilesMerger = new SortedFilesMerger(intermediateFileStreams,
				outputFileStream);
				
			return {
				fileMerger: intermediateFilesMerger,
				outputFile: outputFilePath
			};
		});
}

/**
 * Calculates the number of integers in a file
 *
 * @param {string} filePath - The path to the file to be read. This function assumes 
 *	that the file exists
 * @returns {string[]} A promise that resolves to the number of integers in the
 *	input file
 */
function calculateNumberOfIntegers(filePath) {
	return new Promise((resolve, reject) => {
		//Create a readable file stream
		const readStream = fs.createReadStream(filePath);

		//Create an integer stream from the readable file stream
		const integerStream = fileIO.createIntegerStream(readStream);

		//Set up an error handler
		integerStream.onError(error => reject(error));
		
		//Count the number of integers in the file stream
		integerStream.reduce(0, (total, integer) => total + 1)
			.onValue(total => resolve(total));
	});
}

/**
 * Handles any error that occurs
 *
 * @param error - Information regarding the error that occurred
 */
function handleError(error) {
	console.log(error);
}




