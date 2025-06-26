#!/usr/bin/env bash

mkdir "./tools" & curl -L "https://cloud.perspicuous-computing.science/s/tDkfjWiDoXWf4P5/download" -o ./tools.zip
unzip -o "./tools.zip" 

rm -rf "./tools" 
mv "./backend-tools-dev/" "./tools/"

mkdir -p "./src/public/examples" & curl -L "https://cloud.perspicuous-computing.science/s/ecz5srM7mDMwP2t/download" -o ./examples.zip 

unzip -o "./examples.zip"
rm -rf "./src/public/examples" 
mv "./examples-dev/" "./src/public/examples" 
cp -r "./src/public/examples" "./src/public/data"