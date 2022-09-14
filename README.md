# Evonne: How to use it: 

## Using Docker:
* Install docker, run `docker build . -t <your username>/evonne`. 
* Run `docker run -dp 7007:3000 <your username>/evonne:latest` then open `http://localhost:7007`.

## Local Installation: 
### Requirements:
* **NodeJS**: v. 15+ 
* **Python** : `runtime.txt` & `requirements.txt` (`python3 -m pip install --user --upgrade clingo`)
* **Java**: v. 16+

### Running the server:
* Run `npm install`
* Running `npm start` will download the necessary .jars and libs, then make the app available at: `https://localhost:3000`. 
* If you want to skip the downloads and only run, use `npm run dev` instead.

## Deployment:
### Heroku: 
* The files `Procfile`, `system.properties`, `requirements.txt` and `runtime.txt` are used by heroku. 
* To deploy to heroku, create an app, link it as a remote (`git remote add heroku`) and deploy with: `git push heroku main`.
### Gitlab: 
* An example of continuous integration for gitlab, using docker: `evonne.gitlab-ci.yml`.
* Add as a remote `git remote add deploy <the_gitlab_repo>`, then deploy with `git push deploy main`.

## Jar commands: 
* Extract names: `java -jar extractNames.jar -o <ontology> -od <outputDir>`, 
  produces `cnsHierarchy.json` (class hierarchy) and `cnsOriginal.json` (concept names and URLs)
* Generate proofs of an axiom: `java -jar explain.jar -o <ontology> -a <axiom> -m graph -od <outputDir> -po <proofFilesPrefix>`, 
  produces proofs `<outputDir>/`, evonne uses `.t.xml` and `.ht.xml`
* Compute atomic decomposition: `java -jar explain.jar -o <ontology> -a <axiom> -ad <atomicDecompositionName> -od <outputDir>`, 
  produces `<outputDir>/ad_module.owl.xml`
* Compute diagnoses: `java -jar explain.jar -o <ontology> -a <axiom> -mds <mdsID> -od <outputDir>`, 
  produces `<outputDir>/mDs_<mds_id>.txt`
