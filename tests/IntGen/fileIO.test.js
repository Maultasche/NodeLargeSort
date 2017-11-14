const fs = require('fs');
const fileIO = require('../../IntGen/fileIO');

jest.mock('fs', () => ({ createWriteStream: jest.fn() }));

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
