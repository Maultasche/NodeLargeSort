const fileIO = require('./fileIO');
const numberGen = require('./numberGen');
const commandLine = require('./commandLine');

const args = commandLine.parseCommandLineArgs(process.argv);

//Define the range of the generated numbers
const lowestInteger = -1000000000;
const highestInteger = 1000000000;

//Handle any missing arguments
if(commandLine.missingArgs(args)) {
	commandLine.outputMissingArgs(args);
}
else {
	generateIntegersToFile(args.count, args.file);
}


function generateIntegersToFile(integerCount, fileName) {
	//Open the output file
	const fileStream = fileIO.createWriteableFileStream(args.file);

	//Add an error handler
	fileStream.on('error', error => handleFileError(error, args.file));

	//Create the random integer stream
	const randomIntegerStream = numberGen.createRandomIntegerStream(integerCount, 
		lowestInteger, highestInteger);
		
	//Transform the integers to a string, add a new line, and then write them to the file
	randomIntegerStream
		.map(randomInteger => randomInteger.toString())
		.map(integerString => integerString + '\n')
		.onValue(lineString => fileStream.write(lineString));
		
	//Close the file stream
	fileStream.end();
}


function handleFileError(error, fileName) {
	console.error(`An error occurred when writing to ${fileName}: ${error.message}`);
}




