const Bacon = require('baconjs');
const streamify = require('stream-array');
const _ = require('lodash');


describe('testing the file integer generator write functionality', () =>  {
	//Mock the file IO module
	jest.doMock('../../IntGen/fileIO', () => ({ createWriteableFileStream: jest.fn() }));
	
	//Mock the numberGen module
	jest.doMock('../../IntGen/numberGen', () => ({ createRandomIntegerStream: jest.fn() }));
	
	const fileIO = require('../../IntGen/fileIO');
	const numberGen = require('../../IntGen/numberGen');
	const FileIntegerGenerator = require('../../IntGen/fileIntegerGenerator');
	
	//Reset the mock functions before each test
	beforeEach(() => {
		jest.clearAllMocks();
	});

	//Test data
	const testData = [4, 5, -4, 23, 12, 8, -11, 82];
	const testLowerBound = -20;
	const testUpperBound = 20;
	const testIntegerCount = testData.length;
	const testFileName = 'testFile.txt';	
	
	//Test writing generated integers to a file
	test('generated integers are written to a file', () => {
		//Mock fileIO.createWriteableFileStream to return a mock writeable stream
		const writtenData = [];
		
		const mockWriteableStream = {
			on: jest.fn(),
			end: jest.fn(),
			write: line => writtenData.push(parseInt(line))
		};
		
		fileIO.createWriteableFileStream.mockReturnValueOnce(mockWriteableStream);
		
		//Mock numberGen.createRandomIntegerStream to return a stream of integers
		numberGen.createRandomIntegerStream.mockReturnValueOnce(Bacon.fromArray(testData));
		
		//Construct a file integer generator
		fiGenerator = new FileIntegerGenerator(testLowerBound, testUpperBound);
		
		expect.hasAssertions();
		
		//Write the generated integers to a file
		return expect(fiGenerator.writeToFile(testIntegerCount, testFileName))
			.resolves.not.toBeDefined().then(() => {
				//Verify that the correct data was written to the file
				_.zip(testData, writtenData)
					.forEach(dataPair => expect(dataPair[1]).toBe(dataPair[0]));
				
				//Verify that createWriteableFileStream was called with the correct file name
				expect(fileIO.createWriteableFileStream).toHaveBeenCalledTimes(1);
				expect(fileIO.createWriteableFileStream).toHaveBeenCalledWith(testFileName);
				
				//Verify that numberGen.createRandomIntegerStream was called with
				//the correct arguments
				expect(numberGen.createRandomIntegerStream).toHaveBeenCalledTimes(1);
				expect(numberGen.createRandomIntegerStream).toHaveBeenCalledWith(
					testIntegerCount, testLowerBound, testUpperBound);
			});
	});
	
	//Test the file integer generator events
	test('file integer generator emits the correct events', () => {
		//Mock fileIO.createWriteableFileStream to return a mock writeable stream
		const writtenData = [];
		
		const mockWriteableStream = {
			on: jest.fn(),
			end: jest.fn(),
			write: jest.fn()
		};
		
		fileIO.createWriteableFileStream.mockReturnValueOnce(mockWriteableStream);
		
		//Mock numberGen.createRandomIntegerStream to return a stream of integers
		numberGen.createRandomIntegerStream.mockReturnValueOnce(Bacon.fromArray(testData));
		
		//Construct a file integer generator
		fiGenerator = new FileIntegerGenerator(testLowerBound, testUpperBound);
		
		//Handle the 'integer' event
		fiGenerator.on('integer', integer => writtenData.push(integer));
		
		expect.hasAssertions();
		
		//Write the generated integers to a file
		return expect(fiGenerator.writeToFile(testIntegerCount, testFileName))
			.resolves.not.toBeDefined().then(() => {
				//Verify that the correct data was written to the file
				_.zip(testData, writtenData)
					.forEach(dataPair => expect(dataPair[1]).toBe(dataPair[0]));
			});		
	});
	
	//Test writing generated integers to a file when the writeable filestream emits an error
	test('generated integers are written to a file when a file stream error occurs', () => {
		//Mock fileIO.createWriteableFileStream to return a mock writeable stream
		const writtenData = [];
		let errorHandler = null;
		const errorMessage = "test error";
		
		//Mock the write function to generate an error
		const mockWriteableStream = {
			on: (eventName, handler) => {
				if(eventName === 'error') {
					errorHandler = handler;
				}
			},
			end: jest.fn(),
			write: line => errorHandler(errorMessage)
		};	

		fileIO.createWriteableFileStream.mockReturnValueOnce(mockWriteableStream);
		
		//Mock numberGen.createRandomIntegerStream to return a stream of integers
		numberGen.createRandomIntegerStream.mockReturnValueOnce(Bacon.fromArray(testData));
		
		//Construct a file integer generator
		fiGenerator = new FileIntegerGenerator(testLowerBound, testUpperBound);
		
		expect.hasAssertions();
		
		//Write the generated integers to a file
		return expect(fiGenerator.writeToFile(testIntegerCount, testFileName))
			.rejects.toBe(errorMessage).then(() => {
				//Verify that no data was written
				expect(writtenData.length).toBe(0);
				
				//Verify that createWriteableFileStream was called with the correct file name
				expect(fileIO.createWriteableFileStream).toHaveBeenCalledTimes(1);
				expect(fileIO.createWriteableFileStream).toHaveBeenCalledWith(testFileName);
				
				//Verify that numberGen.createRandomIntegerStream was called with
				//the correct arguments
				expect(numberGen.createRandomIntegerStream).toHaveBeenCalledTimes(1);
				expect(numberGen.createRandomIntegerStream).toHaveBeenCalledWith(
					testIntegerCount, testLowerBound, testUpperBound);
			});		
	});
});
