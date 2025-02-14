FROM ubuntu:18.04
WORKDIR /usr/src/evonne

### 1. node 20
RUN apt-get update && \
    apt-get install -y curl gnupg build-essential && \
    curl --silent --location https://deb.nodesource.com/setup_20.x | bash - && \
    # remove useless files from the current layer
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /var/lib/apt/lists.d/* && \
    apt-get autoremove && \
    apt-get clean && \
    apt-get autoclean

### 2. java 
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive \
    apt-get install -y openjdk-17-jre-headless && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

### 3. python 3.8 
RUN apt update && \
    apt install --no-install-recommends -y build-essential software-properties-common && \
    add-apt-repository -y ppa:deadsnakes/ppa && \
    apt install --no-install-recommends -y python3.8 python3.8-dev python3.8-distutils && \
    apt clean && rm -rf /var/lib/apt/lists/*
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.6 1
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.8 2
RUN curl -s https://bootstrap.pypa.io/get-pip.py -o get-pip.py && \
    python3 get-pip.py --force-reinstall && \
    rm get-pip.py

### 4. clingo
RUN python3 -m pip install --user --upgrade clingo

### 5. install app
COPY package.json ./
RUN npm install pm2 -g
RUN npm install --production

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
