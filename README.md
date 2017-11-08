# Sorting a Large Number of Integers

This project is a fun exercise in sorting a large number of integers while keeping only a subset of integers in memory at any particular time.

This project will consist of two runnable programs.

- A program for generating large numbers of random integers
  - Accepts the number of integers to generate as an input parameter
  - Writes the randomly generated integers to an output file, the name of which is an input parameter
  - The output file will have one integer per line
- A program for sorting the integers
  - Accepts the input file and the maximum number of integers to load into memory at any time during the process
  - Writes the final result to an output file, the name of which is also an input parameter
  - Accepts a parameter which will tell the sorting program to not erase the intermediate files when it is done
  - The input file is assumed to have one integer per line and will produce an output file with one integer per line

## Sorting Strategy

If only N integers can be loaded into memory at any given time, but the total number of integers (T) is such that T > N, we'll have to follow a strategy of sorting chunks of integers and then merging those chunks.

1. Analyze the input file to determine how many lines there are, which will tell us how many integers there are (T)
2. Divide T by N to determine how many chunks of integers we'll be using
3. Read through the input file, reading chunks of N integers into memory
4. Sort each chunk of integers in memory and write each chunk to an intermediate file, which will result in F output files, where F * N <= T. The last chunk will likely be smaller than N unless T % N === 0. This first batch of files will be referred Gen 1 files.
5. We'll open up to P files at a time, where P will probably be 10. Each file contains a chunk of sorted integers, so we'll have P pointers to the integers at the beginning of the file.
6. We'll find the min value in that set of P integers, and write that to an intermediate output file. Then we'll advance the file pointer to the next integer. We'll repeat this until all P file pointers have advanced to the end of the file.
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
