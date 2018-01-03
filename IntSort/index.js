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
	
	//Merge the current set of intermediate files
	return mergeIntermediateFilesSet(intermediateFiles, genNumber, mergeFileCount,
		outputDirectory, currentGenerationFileTemplate, integerCount)
		.then(outputFiles => {
			//TODO: if keepIntermediateFiles === false, delete the intermediate files
			//return fileIO.deleteFiles(intermediateFiles).then(() => outputFiles);
			return outputFiles;
		})
		.then(outputFiles => {			
			if(outputFiles.length === 1) {
				//If there is only one intermediate file left, then it becomes the output file
				console.log(`Gen ${genNumber - 1} files were merged into a single output file`);
				return outputFiles[0];
			}			
			else {
				//If there are multiple intermediate files left, then call this function recursively
				//to merge the next set of intermediate files		
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
	
	//Start the progress bar
	progressBar.start(integerCount, 0);	
	
	//Keep track of the number of sorted integers merged
	let sortedIntegersMergeCount = 0;	
	
	//Create the function that is called whenever an integer is merged
	const onIntegerEvent = () => {
		//Increment the number of sorted integers merged and update the
		//progress bar
		sortedIntegersMergeCount++;
		
		progressBar.update(sortedIntegersMergeCount);
	};
	
	//Divide the intermediate files into chunks of size mergeFileCount and
	//create the file merger objects for each chunk
	return _.chunk(intermediateFiles, mergeFileCount)
		.reduce((promiseChain, fileChunk, index) => {
			//Reduce the array of file chunks into a promise chain which will run
			//merge operations in series. This will prevent too many files from being
			//opened simultaneously, because only one chunk of files will be merged
			//at any particular time
			return promiseChain.then(outputFiles => {
				//Attach the next file merge operation onto the promise chain
				return mergeIntermediateFilesChunk(fileChunk, index, outputDirectory,
					genFileTemplate, onIntegerEvent)
					.then(outputFile => {
						//Build up the list of output files as each file merge operation
						//completes. The result will be a complete list of output files
						//after the entire promise chain has resolved.
						outputFiles.push(outputFile);
						
						return outputFiles;
					});
			});
		}, Promise.resolve([]))
		.finally(() => progressBar.stop());
}	

/**
 * Merges a single chunk of intermediate files into a single output file
 *
 * @param {string[]} intermediateFiles - the intermediate files to be merged
 * @param {number} chunkNum - the number of this chunk of intermediate files. This
 *	is a number we use to generate the name of the output file.
 * @param {string} outputDirectory - The directory where the output file is 
 *	to be written
 * @param {string} genFileTemplate - The template used to construct the output file
 *	name. This template must have a {{chunkNum}} parameter.
 * @param {function} integerEventHandler - the function that is called whenever
 *	an 'integer' event is emitted by the intermediate files merger
 * @returns {Object} a promise that resolves to the name of the output file when
 *	the intermediate files have been merged and the output file has been closed
 */
function mergeIntermediateFilesChunk(intermediateFiles, chunkNum, outputDirectory,
	genFileTemplate, integerEventHandler) {

	//Map a file chunk to an intermediate files merger and an output file
	const outputFile = S(genFileTemplate)
		.template({ chunkNum }).s;
	
	//Create an intermediate files merger, and after it is created, attach the
	//'integer' event handler and start merging the intermediate files.
	//When the merge operation is completed, resolve the promise with the 
	//output file path
	return createIntermediateFilesMerger(intermediateFiles, outputDirectory,
		outputFile)
		.then(mergeItems => {
			const filesMerger = mergeItems.fileMerger;
			const outputFilePath = mergeItems.outputFile;
			
			filesMerger.on('integer', integerEventHandler);
			
			return filesMerger.mergeSortedFiles().then(() => outputFilePath);				
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




