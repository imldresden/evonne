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
* Running `npm start` will download the necessary files and start the app at: `https://localhost:3000`. 
* If you want to skip the downloads and only run, use `npm run dev` instead.

## Deployment:
### Heroku: 
* The files `Procfile`, `system.properties`, `requirements.txt` and `runtime.txt` are used by heroku. 
* Create/connect your heroku app, run `git remote add heroku` and deploy with: `git push heroku main`.
### Gitlab: 
* An example of continuous integration for gitlab, using docker: `evonne.gitlab-ci.yml`.
* Add the remote `git remote add deploy <the_gitlab_repo>`, then deploy with `git push deploy main`.
