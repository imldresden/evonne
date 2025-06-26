FROM ubuntu:25.04
WORKDIR /usr/src/evonne

### 1. node 20
RUN apt-get update && \
    apt-get install unzip -y && \
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

### 3. python
RUN apt-get update && \ 
    apt install python3-pip -y && \
    python3 -m pip install --user --upgrade --break-system-packages clingo

### 5. install evonne 
COPY . ./
RUN npm install pm2 -g && \ 
    npm install --omit=dev

USER root

### 6. download jars and data
RUN chmod 777 build.sh && npm run build 

EXPOSE 3000
CMD ["pm2-runtime", "start", "node server.js --name evonne --log evonne.log"]
