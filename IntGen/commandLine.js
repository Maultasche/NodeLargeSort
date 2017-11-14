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
const outputMissingArgs = () => {
	if(args.count === null) {
		console.log("An integer count is required");
	}
	if(args.file === null) {
		console.log("An output file is required");
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
		.usage('<integer count> <file>')
		.parse(processArgs);
	
	const args = {
		count: program.args.length > 0 ? parseInt(program.args[0]) : null,
		file: program.args.length > 1 ? program.args[1] : null
	};
	
	return args;
};

const commandLine = {
	outputMissingArgs,
	missingArgs,
	parseCommandLineArgs
};

module.exports = commandLine;