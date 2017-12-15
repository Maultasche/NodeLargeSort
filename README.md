# Sorting a Large Number of Integers

This project is a fun exercise in sorting a very large number of integers while keeping only a subset of integers in memory at any particular time. The number of integers to load and keep in memory at any given time is known as "chunk", and all the integers will be sorted and placed in an output file without ever storing more than one chunk of integers in memory.

How do we sort a bunch of integers without loading them all into memory? The answer is files: we produce a lot of sorted intermediate files and them merge them together one integer at at time to produce the final sorted output file.

I originally saw this listed somewhere as an interview question, and while I figured out the answer fairly quickly ("Store the integers in files, sort them in chunks, and then merge the sorted chunks"), I found myself pondering the implementation details. In other words, how would I implement that solution?. After thinking about the implementation details and coming up with a strategy, I decided to go ahead and implement it and see if the solution in my head would actually work.

The solution did work.

This project consists of two runnable program.

1. A program for generating large numbers of random integers
  - Accepts the number of integers to generate as an input parameter
  - Writes the randomly generated integers to an output file, the name of which is an input parameter
  - The output file will have one integer per line
2. A program for sorting the integers
  - Accepts the input file and the maximum number of integers to load into memory at any time during the process (aka the chunk size)
  - Writes the final result to an output file, the name of which is also an input parameter
  - Accepts a parameter which will tell the sorting program to not erase the intermediate files when it is done
  - The input file is assumed to have one integer per line and will produce an output file with one integer per line

## Current Status

This project is now finished and working as expected. The integer generator tool generates a text file containing random integers and the sorting tool sorts the integers in a text file without loading more than a specified number of integers into memory at any particular time.

There are a few issues outstanding, which I found during testing. See issues on the Github repository for details.

## Running the Integer Generator and Sorting Tools

To run the integer generation and sorting tools, you'll need to [install yarn](https://yarnpkg.com/lang/en/docs/install/). 

To download and install the dependencies:

```
yarn install
```

To generate use the integer generation tool to generate random integers, run ```yarn gen```. The following example will generate 10,000 integers between -1,000 and 1,000 and write the results into data/randomNumbers.txt.

```
yarn gen --count 10000 --lowerBound -1000 --upperBound 1000 data/randomNumbers.txt
```

To sort a text file containing an integer on each line, run ```yarn sort```. The following example will read the integers in data/randomNumbers.txt in chunks of 100, meaning that no more than 100 integers will be in memory at any given time. The integers will be sorted using intermediate files and then merged into a single file without keeping more than 100 integers in memory at a time. The sorted integers will be written to output/sortedIntegers.txt.

The ```--keepIntermediate``` flag will leave the intermediate files in place so that they can be examined. If you remove the ```--keepIntermediate``` flag, all the intermediate files will be cleaned up after the program completes, and just the final output file will remain.

```
yarn sort --inputFile data/randomIntegers.txt --chunkSize 100 --keepIntermediate output/sortedIntegers.txt
```

To run the unit tests:

```
yarn test
```

## The Playground

The [playground](playground/README.md) is where I've done some proof-of-concept programs that apply to this project.
  
## Sorting Strategy

If only N integers can be loaded into memory at any given time, but the total number of integers (T) is such that T > N, we'll have to follow a strategy of sorting chunks of integers and then merging those chunks.

1. Analyze the input file to determine how many lines there are, which will tell us how many integers there are (T)
2. Divide T by N (rounding up) to determine how many chunks of integers we'll be using
3. Read through the input file, reading chunks of N integers into memory
4. Sort each chunk of integers in memory and write each chunk to an intermediate file, which will result in F intermediate files, where F * N <= T. The last chunk will likely be smaller than N unless T % N === 0. This first batch of files will be referred to as Gen 1 files.
5. We'll open up to P files at a time, where P will probably be 10. Each file contains a chunk of sorted integers, so we'll have P pointers to the integers at the beginning of the file.
6. We'll find the min value in that set of P integers, and write that to an intermediate output file. Then we'll take the file pointer where the min value originated from and advance that file pointer to the next integer. We'll repeat this until all P file pointers have advanced to the end of the file.
7. Repeat Steps 5 and 6 until all F output files have been processed. The resulting sorted files will be referred to as Gen 2 files. 
8. At this point, we may only have one Gen 2 file, in which case we are be finished, but if F > P, we'll have multiple Gen 2 files where the size of each file is P * N integers. In that case, repeat Steps 5 - 7 until all we only produce a single output file (the Gen R file, where R is the number of intermediate file iterations we went through). 

Each intermediate file iteration will reduce the number of intermediate files by a factor of P, so the performance of the merging process will be O(N Log(N))

## Testing Stategy

- Test sorting an empty file
- Test sorting a file with a single number
- Test sorting 20 numbers, where we can easily verify all the numbers
- Test sorting an input file where T < N, and verify that the correct intermediate files were produced
- Test sorting an input file where T === N, and verify that the correct intermediate files were produced
- Test sorting an input file where T > N, and verify that the correct intermediate files were produced
- Test sorting an input file where T > P * N, and verify that the correct intermediate files were produced
- Test sorting a very large number of integers (like a billion integers)
- Test sorting using small (1,000), moderate (10,000), and large numbers for N (1,000,000)

## Notes

When merging the intermediate files into a sorted output file, the sort program will be reading integers one at a time from multiple intermediate files (likely 10 at a time) with one integer from each intermediate file in memory at a time. If the number of intermediate files being processed is larger than the chunk size, then there will be more than a chunk size of integers in memory. That will only be the case for very tiny chunks. If you're noticing this happen, what are you doing specifying such a tiny chunk size anyway? That's just silly!
