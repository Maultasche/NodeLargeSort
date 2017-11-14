const Promise = require('bluebird');

const fs = Promise.promisifyAll(require('fs'));
const readline = require('readline');

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
 * Writes a number to a stream as text, terminating the number with a newline
 *
 * @param stream - The stream to which the number will be written (as text)
 * @param number - The number to be written
 */
function writeNumberToStream(stream, number) {
	throw new Exception('Not Implemented');
}

const fileIO = {
	createWriteableFileStream,
	writeNumberToStream
};

module.exports = fileIO;
