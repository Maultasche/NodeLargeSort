# The Playground

The playground is where I play around with various concepts that could prove useful for the development of this project.

## [Number Stream](numberStream.js)

Since I'm working with bacon streams, I needed to work out a way to have multiple streams of numbers, but only remove the lowest number from a stream each time. This simulates reading from multiple sorted intermediate files are writing the lowest number to the output file.

I used a Bacon bus to simulate the stream of numbers coming from the file and merged the streams into a single stream that produces an array of numbers, one from each stream. Each time, I cause another number to be emitted on the stream with the lowest number, which causes another array to be emitted with the new set of numbers. All the numbers are the same as the previous event in the stream except the lowest number, which is now replaced by the next number in that stream.

It took me a while to figure out how to do this, and it turns out that the secret was Bacon.combineAsArray(). Then I was able to do a sequence of mapping to convert the
streams into a single stream of sorted integers.

## [Progress Bar](progressBar.js)

I wanted to show some sort of visual indicator of how the integer generation or sorting is progressing, so I experimented with showing progress in a progress bar. I created a Bacon stream that generates numbers (1 to 100), emitting one number every 100ms. Then I updated a progress bar created using the progress-cli module every time an event is emitted. The result was a satisfying progress bar showing what was currently happening.
