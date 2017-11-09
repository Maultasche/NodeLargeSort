const fs = require('fs');
const readline = require('readline');
const parseCommandLineArgs = require('./parseCommandLineArgs');

const args = parseCommandLineArgs(process.argv);

if(handleMissingArgs(args)) {
	console.log(JSON.stringify(args));
}



//Handles any missing arguments
function handleMissingArgs() {
	if(args.count === null) {
		console.log("An integer count is required");
	}
	if(args.file === null) {
		console.log("An output file is required");
	}
}
