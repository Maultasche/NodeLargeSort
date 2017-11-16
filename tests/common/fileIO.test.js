const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const fileIO = require('../../common/fileIO');

//Mock the fs module
jest.mock('fs', () => ({ createWriteStream: jest.fn(), statAsync: jest.fn() }));

//Mock the path module
jest.mock('path', () => ({ dirname: jest.fn() }));

//Mock the mkdirp function
jest.mock('mkdirp', () => jest.fn());

//Reset the mock functions before each test
beforeEach(() => {
	jest.clearAllMocks();
});

//Test creating a writeable file stream
describe('testing creating a writeable file stream', () => {
	//Create mock file stream
	const mockFileStream = { id: 'Mock file stream' };
	
	//Mock fs.createWriteStream() to return the mock file stream
	fs.createWriteStream.mockReturnValueOnce(mockFileStream);
	
	//Test that the writeable file stream is created succesfully
	test('the writeable file stream can be created', () => {
		const fileName = './data/dataFile.dat';
		
		//Call the function to create a writeable file stream
		const fileStream = fileIO.createWriteableFileStream(fileName);
		
		//Verify that the file stream object is correct
		expect(fileStream).toBe(mockFileStream);
		
		//Verify that fs.createWriteStream() was called once with the
		//correct arguments
		expect(fs.createWriteStream.mock.calls.length).toBe(1);
		expect(fs.createWriteStream.mock.calls[0].length).toBe(1);
		expect(fs.createWriteStream.mock.calls[0][0]).toBe(fileName);
	});
});

//Test ensuring that a directory for a file exists
describe('testing ensuring that a directory for a file exists', () => {

	const fileName = "data/output/dataFile.txt";
	const fileDirectory = "data/output";
	
	//Test that a non-existent directory is automatically created
	test('an non-existent directory is created', () => {
		//Mock the stat function so that it indicates that the directory
		//doesn't exist
		fs.statAsync.mockReturnValueOnce(Promise.reject(new Error('does not exist')));
		
		//Mock the mkdirp function to return a successful promise
		mkdirp.mockReturnValueOnce(Promise.resolve());

		//Mock path.dirname to return the correct directory
		path.dirname.mockReturnValueOnce(fileDirectory);
		
		expect.hasAssertions();
		
		//Call the function to ensure that the file directory exists
		return expect(fileIO.ensureFilePathExists(fileName)).resolves.not.toBeDefined()
			.then(() => {
				//Verify that fs.statAsync was only called once
				expect(fs.statAsync).toHaveBeenCalledTimes(1);
				
				//Verify that fs.statAsync was called with the correct arguments
				expect(fs.statAsync).toHaveBeenCalledWith(fileDirectory);
				
				//Verify that mkdirp was called once
				expect(mkdirp).toHaveBeenCalledTimes(1);
				
				//Verify that mkdirp was called with the correct arguments
				expect(mkdirp).toHaveBeenCalledWith(fileDirectory);
			});
	});

	//Test that no directory is created when it already exists
	test('no directories are created when the directory already exists', () => {
		//Mock the stat function so that it indicates that the directory
		//does exist
		fs.statAsync.mockReturnValueOnce(Promise.resolve({
			isDirectory: () => true
		}));
		
		//Mock path.dirname to return the correct directory
		path.dirname.mockReturnValueOnce(fileDirectory);
		
		expect.hasAssertions();
		
		//Call the function to ensure that the file directory exists
		return expect(fileIO.ensureFilePathExists(fileName)).resolves.not.toBeDefined()
			.then(() => {
				//Verify that fs.statAsync was only called once
				expect(fs.statAsync).toHaveBeenCalledTimes(1);
				
				//Verify that fs.statAsync was called with the correct arguments
				expect(fs.statAsync).toHaveBeenCalledWith(fileDirectory);
				
				//Verify that mkdirp was never called
				expect(mkdirp).not.toHaveBeenCalled();
			});
	});
	
	//Test what happens when there's a file with the same name as the directory
	test('no directories are created when a file with the same name as the ' + 
		'directory already exists', () => {
		//Mock the stat function so that it indicates that the directory
		//does exist
		fs.statAsync.mockReturnValueOnce(Promise.resolve({
			isDirectory: () => false
		}));
		
		//Mock path.dirname to return the correct directory
		path.dirname.mockReturnValueOnce(fileDirectory);
		
		expect.hasAssertions();
		
		//Call the function to ensure that the file directory exists
		return expect(fileIO.ensureFilePathExists(fileName)).rejects.toBeDefined()
			.catch((error) => {
				expect(error.message).toMatch('already exists');
			});
	});
	
	//Test what happens when there's an error when creating a non-existent
	//directory
	test('promise rejects when there\'s an error when creating the directory', () => {
		const errorMessage = 'Could not create directory';
		
		//Mock the stat function so that it indicates that the directory
		//doesn't exist
		fs.statAsync.mockReturnValueOnce(Promise.reject(new Error('does not exist')));
		
		//Mock the mkdirp function to return a rejected promise
		mkdirp.mockReturnValueOnce(Promise.reject(new Error(errorMessage)));

		//Mock path.dirname to return the correct directory
		path.dirname.mockReturnValueOnce(fileDirectory);
		
		expect.hasAssertions();
		
		//Call the function to ensure that the file directory exists
		return expect(fileIO.ensureFilePathExists(fileName)).rejects.toBeDefined()
			.catch((error) => {
				//Verify that the error contains the correct information
				expect(error.message).toBe(errorMessage);
				
				//Verify that fs.statAsync was only called once
				expect(fs.statAsync).toHaveBeenCalledTimes(1);
				
				//Verify that fs.statAsync was called with the correct arguments
				expect(fs.statAsync).toHaveBeenCalledWith(fileDirectory);
				
				//Verify that mkdirp was called once
				expect(mkdirp).toHaveBeenCalledTimes(1);
				
				//Verify that mkdirp was called with the correct arguments
				expect(mkdirp).toHaveBeenCalledWith(fileDirectory);
			});
	});	
});