var program = require('commander');

program
	.version('1.0.0')
	.usage('[options] <file>')
	.option('-c, --count <number>', 'The number of integers to generate', parseInt);

const parseCommandLineArgs = (processArgs) => {
	program.parse(processArgs);
	
	const args = {
		count: program.count ? program.count : null,
		file: program.args.length > 0 ? program.args[0] : null
	};
	
	return args;
};	

module.exports = parseCommandLineArgs;