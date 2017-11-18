const fileIO = require('./fileIO');
const numberGen = require('./numberGen');
const commandLine = require('./commandLine');
const progress = require('cli-progress');
const FileIntegerGenerator = require('./FileIntegerGenerator');

const args = commandLine.parseCommandLineArgs(process.argv);

//Handle any missing arguments
if(commandLine.missingArgs(args)) {
	commandLine.outputMissingArgs(args);
}
else {
	fileIO.ensureFilePathExists(args.file)
		.then(() => {
			const fileIntegerGenerator = new FileIntegerGenerator(args.lowerBound, 
				args.upperBound);

			//Keep track of how many integers we've generated
			let currentIntegerCount = 0;
			
			//Create a progress bar to show the current state of integer generation
			const progressBarFormat = 'Generating numbers {bar} | {percentage}% | {value}/{total}';
			const progressBar = new progress.Bar({ format: progressBarFormat },
				progress.Presets.shades_classic);
				
			//Add an error handler
			fileIntegerGenerator.on('error', 
				error => handleFileError(error, args.file));
				
			//Add an end handler
			fileIntegerGenerator.on('end', () => {
				progressBar.stop()
				
				console.log("Writing generated numbers to file...");
			});

			//Add an integer generation handler
			fileIntegerGenerator.on('integer', () => {
				currentIntegerCount++;
				
				progressBar.update(currentIntegerCount);
			});
			
			//Start the process of generating integers and writing them to a file
			progressBar.start(args.count, 0);
			
			fileIntegerGenerator.writeToFile(args.count, args.file);
			
		})
		.catch(error => console.log(error));
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




