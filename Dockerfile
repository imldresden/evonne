FROM ubuntu:25.04
WORKDIR /usr/src/evonne

### 1. node 20
RUN apt-get update && \
    apt-get install curl -y && \
    curl -sL https://deb.nodesource.com/setup_20.x | bash && \
    apt-get install nodejs -y && \
    node -v && npm -v

### 2. java 
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive \
    apt-get install -y openjdk-17-jre-headless && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

### 5. install app
COPY package.json ./
RUN npm install pm2 -g
RUN npm install extract-zip-relative-path -g
RUN npm install --omit=dev

COPY frontend ./frontend/
COPY .env ./
COPY server.js ./

### 6. jars and external libs
RUN npm run download-all 

### 7. ensure fs permissions
USER root
RUN chmod -R 777 ./frontend/public/examples

EXPOSE 3000
CMD ["pm2-runtime", "start", "node server.js --name evonne --log evonne.log"]
