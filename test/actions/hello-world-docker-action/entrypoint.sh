#!/bin/sh -l

echo "who-to-greet: $1"
time=$(date)
echo $time
echo "time=$time" >> $GITHUB_OUTPUT
