const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const commonFileIO = require('../common/fileIO');
const readline = require('readline');

function createIntegerReadStream(fileReadStream) {
	const rlIntegers = readline.createInterface({
		input: fileReadStream
	});
	
	rl.on('line', integerString => {
		console.log(integerString);
	});
}

/**
 * Indicates whether a file exists
 *
 * @param fileName - The path and name of a file
 * @returns a promise that resolves to true if the file exists, 
 * 	false if the file does not exist
 */
function fileExists(fileName) {
	return fs.statAsync(fileName)
		.then(stats => {
			let fileExists = false;
			
			if(stats.isFile()) {
				fileExists = true;
			}
			
			return fileExists;
		})
		.catch(error => false);
}

const fileIO = {
	createWriteableFileStream: commonFileIO.createWriteableFileStream,
	ensureFilePathExists: commonFileIO.ensureFilePathExists,
	fileExists
};

module.exports = fileIO;
