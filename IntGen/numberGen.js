const Bacon = require('baconjs');

/**
 * Creates a stream of randomly generated integers
 *
 * This function assumes that integerCount >= 0.
 * This function assumes that lowerBound <= upperBound.
 *
 * @param integerCount - The number of random integers to be generated.
 * @param lowerBound - The lower bound (inclusive) of the integer range
 * @param upperBound - The upper bound (inclusive) of the integer range
 * @returns A stream of randomly-generated integers
 */
function createRandomIntegerStream(integerCount, lowerBound, upperBound) {
	let count = 0;
	
	let paused = false;
	let hasEnded = false;
	
	//TODO: Enhance this by creating a Bacon extension that is the equivalent of
	//of ".holdWhen", except that it's called ".pauseWhen" and is passed a pause stream
	//How to add this extension? We'll have to add an extension to Bacon.Observable.prototype
	//const addPausableBaconStream = require('pausable-bacon-stream');
	//Note: this is probably not practical, since only certain streams would be pausable
	
	const pauseStream = new Bacon.Bus();
	const pauseProperty = pauseStream.toProperty(false);
	
	function createPausableStream(generateFunc) {
		const pausableStream = Bacon.fromBinder(sink => 
			createPausedGenerator(generateFunc, sink));
			
		pausableStream.pause = () => pauseStream.push(true);
		pausableStream.resume = () => pauseStream.push(false);	
		
		return pausableStream;
	}
	
	function createPausedGenerator(generateFunc, sink) {
		const pauseSink = streamEvent => {
			if(streamEvent.isEnd && streamEvent.isEnd()) {
				hasEnded = true;
			}

			sink(streamEvent);
		}
		
		pauseProperty.onValue(pauseValue => {
			//console.log("Pause Value: ", pauseValue);
			
			paused = pauseValue;
			
			if(!paused && !hasEnded) {
				repeatUntilPaused(() => generateFunc(pauseSink));
			}			
		});	
	}
	
	function repeatUntilPaused(func) {
		//console.log("Repeating");
		
		return Promise.resolve()
			.then(() => {
				func();
				
				if(!paused && !hasEnded) {
					return repeatUntilPaused(func);
				}
			});
	}

	
	function generateRandomIntegersFunc(sink) {
		count++;
		
		if(count <= integerCount) {
			//console.log("Generate: ", count);
			sink(generateRandomInteger(lowerBound, upperBound));
		}
		else {
			//console.log("Trigger end!");
			sink(new Bacon.End());
		}		
	}
	
	const stream = createPausableStream(generateRandomIntegersFunc);
	
	// const stream = Bacon.fromBinder(sink => {
		 // pausedGenerateFunction
		// //const delay = 0;
		// //emitValue(1);
		
		// // setTimeout(() => {
			// // count++;
			
			// // if(count < integerCount) {
				// // console.log("Generate: ", count);
				// // sink(generateRandomInteger(lowerBound, upperBound));
			// // }
			// // else {
				// // sink(new Bacon.End());
			// // }
		// // }, 1000);

		// // function emitValue(currentCount) {		
			// // if(currentCount < integerCount) {
				// // console.log("Generate: ", currentCount);
				// // sink(generateRandomInteger(lowerBound, upperBound));
				
				// // setTimeout(() => emitValue(currentCount + 1), delay);
			// // }
			// // else {
				// // sink(new Bacon.End());
			// // }		
		// // }
	// });
	

	
	// const stream = Bacon.repeat(currentIteration => {
		// setTimeout(() => {
			// count++;
			
			// if(currentIteration < integerCount) {
				// console.log("Generate: ", count);
				// return Bacon.once(generateRandomInteger(lowerBound, upperBound));
			// }
			// else {
				// return false;
			// }
		// }, 1000);
	// });
	
	// const stream = Bacon.fromBinder(sink => {
		// Promise.resolve().then(() => {
			// const promises = [];
			
			// for(let i = 0; i < integerCount; i++) {
				
				// promises.push(Promise.resolve().then(() => {
					// console.log("Generate: ", i + 1);

					// console.log("baba");
					
					// sink(generateRandomInteger(lowerBound, upperBound));
					
					// console.log("Done");
				// }));
			// }
			
			// return Promise.all(promises).then(() => sink(new Bacon.End()));
		// });
	// });
	
	return stream;
}

/**
 * Generates a random integer between a lower bound (inclusive) 
 * and an upper bound (inclusive)
 *
 * @param lowerBound - The lower bound (inclusive) of the integer range
 * @param upperBound - The upper bound (inclusive) of the integer range
 * @returns A randomly generated integer within the specified range
 */
function generateRandomInteger(lowerBound, upperBound) {
	return Math.floor(Math.random() * (upperBound - lowerBound + 1) + lowerBound); 
}

const numberGen = {
	createRandomIntegerStream
};

module.exports = numberGen;