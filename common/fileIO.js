const Promise = require('bluebird');

const fs = Promise.promisifyAll(require('fs'));
const mkdirp = Promise.promisifyAll(require('mkdirp'));
const path = require('path');

/**
 * Creates a writeable file stream
 *
 * The file being opened as a writeable stream will cause any existing file to
 * be overwritten.
 *
 * @param fileName - The name of the file to open as a writeable stream
 * @returns A writeable file stream
 */
function createWriteableFileStream(fileName) {
	return fs.createWriteStream(fileName);
}

/**
 * Ensures that the directory in a file path exists, creating the directory
 * if it currently does not exist
 *
 * @param fileName - The name and path of a file
 * @returns A promise that will resolve when the directory exists or an
 * 	error occurred while attempting to create the directory
 */
function ensureFilePathExists(fileName) {
	//Get the file's directory
	const directory = path.dirname(fileName);
	
	//Check if the directory exists
	directoryExists = fs.statAsync(directory)
		.then(stats => {
			if(stats.isDirectory()) {
				return true;
			}
			else {
				throw new Error(`A file with the name "${directory}" already exists`);
			}			
		},
		error => false)
		
		
	//If the directory exists, create the directory
	return directoryExists.then(exists => {
		if(!exists) {
			return mkdirp(directory);
		}
	});
}

const fileIO = {
	createWriteableFileStream,
	ensureFilePathExists
};

module.exports = fileIO;
