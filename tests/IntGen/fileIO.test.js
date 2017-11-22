const commonFileIO = require('../../common/fileIO');
const fileIO = require('../../IntGen/fileIO');

//Ensure that the necessary functions from the common fileIO module are provided
describe('ensuring that the necessary functions from the common fileIO ' + 
	'module are provided', () => {

	//Verify that the common createWriteableFileStream() function is provided
	test('the common createWriteableFileStream() function is provided', () => {
		expect(fileIO.createWriteableFileStream)
			.toBe(commonFileIO.createWriteableFileStream);
	});
	
	//Verify that the common ensureDirectoryExists() function is provided
	test('the common ensureDirectoryExists() function is provided', () => {
		expect(fileIO.ensureDirectoryExists)
			.toBe(commonFileIO.ensureDirectoryExists);
	});
	
	//Verify that the common ensureFilePathExists() function is provided
	test('the common ensureFilePathExists() function is provided', () => {
		expect(fileIO.ensureFilePathExists)
			.toBe(commonFileIO.ensureFilePathExists);
	});
});
