# Evonne

## Docker:
* Install docker, run `docker build . -t <your username>/evonne`. 
* Run `docker run -dp 7007:3000 <your username>/evonne:latest` then open `http://localhost:7007`.

## Local Installation: 
### Requirements:
* **Server**
  * Node.js v. 15+ 

* **INCA**
  * `runtime.txt` & `requirements.txt` (`python3 -m pip install --user --upgrade clingo`)

* **Evee**
  * Java v. 16+

### Running the server:
* Run `npm install`
* If you just cloned the repo, use `npm start` which will download the necessary jars and libs, then make the app available at: `https://localhost:3000`. 
* If you want to skip the downloads, use `npm run dev` instead. 

### Run as background service using pm2: 
* Install pm2 globally: `npm install pm2@latest -g`
* Create a new process: `pm2 start "PORT=7007 node server.js" --name evonne --log "evonne.log"`
* Check all pm2 processes: `pm2 ls`
* Run `docker run -dp 7007:3000 <your username>/evonne:latest` then open `http://localhost:7007`.

## Heroku deployment:
* The Procfile defines the only command that will be run explicitly in the heroku container
* The heroku container is linked to the `heroku` branch. To deploy a current version: `git push heroku main`
* To set up a different container, use: 
  `heroku create` creates the heroku app with the linked heroku account in the terminal 
  `heroku buildpacks:set heroku/nodejs` to run the main node js app. 
  `heroku buildpacks:add -i 2 heroku/python` to run the scripts, dependencies in `requirements.txt` & `runtime.txt`. 
  `heroku buildpacks:add -i 3 heroku/jvm` to execute the jars. 

## Jar commands: 
* Extract names: `java -jar extractNames.jar -o <ontology> -od <outputDir>`, 
  produces `cnsHierarchy.json` (class hierarchy) and `cnsOriginal.json` (concept names and URLs)
* Generate proofs of an axiom: `java -jar explain.jar -o <ontology> -a <axiom> -m graph -od <outputDir> -po <proofFilesPrefix>`, 
  produces proofs `<outputDir>/`, evonne uses `.t.xml` and `.ht.xml`
* Compute atomic decomposition: `java -jar explain.jar -o <ontology> -a <axiom> -ad <atomicDecompositionName> -od <outputDir>`, 
  produces `<outputDir>/ad_module.owl.xml`
* Compute diagnoses: `java -jar explain.jar -o <ontology> -a <axiom> -mds <mdsID> -od <outputDir>`, 
  produces `<outputDir>/mDs_<mds_id>.txt`

