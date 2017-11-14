var program = require('commander');

/**
 * Indicates if any command line arguments are missing
 *
 * @param args - The object containing the command line argument values
 * @returns true if command line arguments are missing, otherwise false
 */
const missingArgs = (args) => 
	args.count === null || args.file === null;

/**
 * Outputs any missing command line arguments
 *
 * @param args - The object containing the command line argument values
 */
const outputMissingArgs = (args) => {
	let missingArgs = false;
	
	if(args.count === null) {
		console.log("An integer count is required");
		missingArgs = true;
	}
	if(args.lowerBound === null) {
		console.log("The lower bound is required");
		missingArgs = true;
	}
	if(args.lowerBound === null) {
		console.log("The upper bound is required");
		missingArgs = true;
	}
	if(args.file === null) {
		console.log("An output file is required");
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
		.usage('[options] <file>')
		.option('-c, --count <n>', 'The number of integers to generate', parseInt)
		.option('-l, --lowerBound <n>', 'The lower bound of the integer range', parseInt)
		.option('-u, --upperBound <n>', 'The upper bound of the integer range', parseInt)
		.parse(processArgs);
	
	const args = {
		count: program.count === undefined ? null : program.count,
		lowerBound: program.lowerBound === undefined ? null : program.lowerBound,
		upperBound: program.upperBound === undefined ? null : program.upperBound,
		file: program.args.length > 0 ? program.args[0] : null
	};
	
	return args;
};

const commandLine = {
	outputMissingArgs,
	missingArgs,
	parseCommandLineArgs
};

module.exports = commandLine;