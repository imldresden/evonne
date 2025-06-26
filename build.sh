#!/usr/bin/env bash

# downloads jars and python scripts
curl -L https://cloud.perspicuous-computing.science/s/tDkfjWiDoXWf4P5/download -o ./tools.zip
unzip -o ./tools.zip 

# replaces destination
rm -rf ./tools
mv ./tools-dev ./externalTools

# downloads example data
curl -L https://cloud.perspicuous-computing.science/s/ecz5srM7mDMwP2t/download -o ./examples.zip 
unzip -o ./examples.zip

# replaces destination
rm -rf ./src/public/examples
mv ./examples-dev ./src/public/examples
chmod -R a+rwx ./src/public/examples

# copies onto data folder so that all projects can be accessed directly
rm -rf ./src/public/data
cp -r ./src/public/examples/ ./src/public/data
chmod -R a+rwx ./src/public/data
