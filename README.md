# Evonne

## Using Docker:
* Install docker, run `docker build . -t <your username>/evonne`. 
* Run `docker run -dp <port>:3000 <your username>/evonne:latest` then open `http://localhost:<port>`.
* Note that the host port (3000) should match between the `DockerFile` and  `.env` files!

## Local Installation: 
### Requirements:
* **NodeJS**: v. 20+ 
* **Python** : `runtime.txt` & `requirements.txt` (`python3 -m pip install --user --upgrade clingo`)
* **Java**: v. 16+

### Running the server:
* Run `npm install`
* Running `npm start` will download the necessary files and start the app at: `https://localhost:3030`. 
* If you want to skip the downloads and only run, use `npm run dev` instead.
* If you want to modify the port, edit the `.env`

## Deployment: 
* An example of continuous integration for gitlab, using docker: `evonne.gitlab-ci.yml`.
* Add the remote `git remote add deploy <the_gitlab_repo>`, then deploy with `git push deploy main`.
