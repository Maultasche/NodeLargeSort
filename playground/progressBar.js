const progress = require('cli-progress');
const Bacon = require('baconjs');

//Define the total events that will be generated
const total = 100;

//Indicate that we are starting number generation
console.log("Starting number generation...");

//Create the progress bar
const progressBarFormat = '{bar} | {percentage}% | {value}/{total}';

var progressBar = new progress.Bar({ format: progressBarFormat },
	progress.Presets.shades_classic);

//Start the progress bar
progressBar.start(total, 1);

//Create the stream to generate the number events
const numberStream = Bacon.repeat(counterValue => {
	if(counterValue < total) {
		return Bacon.once(counterValue + 1);
	}
	else {
		return false
	}
});

//Create a throttled stream that emits an event at an interval
//instead of as quickly as it can. 
const delayedNumberStream = numberStream
	.bufferingThrottle(50);
	
//Whenever the delayed number stream emits a value,
//we update the progress bar	
delayedNumberStream.onValue(value => progressBar.update(value));

//Take some actions when the stream has finished
delayedNumberStream.onEnd(() => {
	//Stop the progress bar
	progressBar.stop();
	
	//Output a message indicating that number generation is complete
	console.log("Number generation complete")
});
//numberStream.onEnd(() => console.log("Done"));