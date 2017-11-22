const commonFileIO = require('../common/fileIO');

const fileIO = {
	createWriteableFileStream: commonFileIO.createWriteableFileStream,
	ensureDirectoryExists: commonFileIO.ensureDirectoryExists,
	ensureFilePathExists: commonFileIO.ensureFilePathExists
};

module.exports = fileIO;
