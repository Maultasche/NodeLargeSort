var program = require('commander');

/**
 * Indicates if any command line arguments are missing
 *
 * @param args - The object containing the command line argument values
 * @returns true if command line arguments are missing, otherwise false
 */
const missingArgs = (args) => 
	args.inputFile === null || args.outputFile === null || args.chunkSize === null;

/**
 * Outputs any missing command line arguments
 *
 * @param args - The object containing the command line argument values
 */
const outputMissingArgs = (args) => {
	let missingArgs = false;
	
	if(args.inputFile === null) {
		console.log("The input file is required");
		missingArgs = true;
	}
	if(args.outputFile === null) {
		console.log("The output file is required");
		missingArgs = true;
	}
	if(args.chunkSize === null) {
		console.log("The integer chunk size is required");
		missingArgs = true;
	}
	
	if(missingArgs) {
		console.log("Use the --help option for command line information");
	}
};

/**
 * Parses the command line arguments
 *
 * @param processArgs - The raw command line arguments
 * @returns An object containing the parsed command line argument values
 */
const parseCommandLineArgs = (processArgs) => {
	program
		.version('1.0.0')
		.usage('[options] <output file>')
		.option('-i, --inputFile <n>', 'The input file to read from')
		.option('-c, --chunkSize <n>', 'The max size of the chunk of integers that can be ' +
			'loaded into memory at any particular time', parseInt)
		.option('-k, --keepIntermediate', 'If this option is specified, all the ' +
			'intermediate files are kept instead of deleted')
		.parse(processArgs);
	
	const args = {
		outputFile: program.args.length > 0 ? program.args[0] : null,
		inputFile: program.inputFile === undefined ? null : program.inputFile,
		chunkSize: program.chunkSize === undefined ? null : program.chunkSize,
		keepIntermediate: program.keepIntermediate === undefined ? false : true
	};
	
	return args;
};

const commandLine = {
	outputMissingArgs,
	missingArgs,
	parseCommandLineArgs
};

module.exports = commandLine;