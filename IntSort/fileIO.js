const commonFileIO = require('../common/fileIO');

const fileIO = {
	createWriteableFileStream: commonFileIO.createWriteableFileStream,
	ensureFilePathExists: commonFileIO.ensureFilePathExists
};

module.exports = fileIO;
