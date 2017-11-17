const fs = require('fs');
const fileIO = require('../../IntSort/fileIO');

//Mock the fs module
jest.mock('fs', () => ({ statAsync: jest.fn() }));

//Reset the mock functions before each test
beforeEach(() => {
	jest.clearAllMocks();
});

//Test the fileExists function
describe('testing detecting whether a file exists', () => {
	test('indicates that a file exists when it does exist', () => {
		//Mock the fs.statAsync function to indicate that a file exists
		fs.statAsync.mockReturnValueOnce(Promise.resolve({
			isFile: () => true
		}));
		
		//Find out whether a file exists
		return expect(fileIO.fileExists('testfile.txt')).resolves.toBe(true);
	});
	
	test('indicates that a file does exist when it is a directory', () => {
		//Mock the fs.statAsync function to indicate that a file exists
		fs.statAsync.mockReturnValueOnce(Promise.resolve({
			isFile: () => false,
			isDirectory: () => true
		}));
		
		//Find out whether a file exists
		return expect(fileIO.fileExists('testfile.txt')).resolves.toBe(false);
	});
	
	test('indicates that a file does exist when there is nothing ' + 
		'with that file name', () => {
		//Mock the fs.statAsync function to indicate that a file exists
		fs.statAsync.mockReturnValueOnce(Promise.reject(new Error('does not exist')));
		
		//Find out whether a file exists
		return expect(fileIO.fileExists('testfile.txt')).resolves.toBe(false);
	});
});
