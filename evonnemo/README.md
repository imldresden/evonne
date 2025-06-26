This sample subproject integrates nemo-web with evonne's interactive tracing. 

The Dockerfile builds nemo-web and evonnemo, then serves the static sites under the same origin to enable communication using the BroadcastChannel API. 
To use docker (after installing docker...), you can use `npm run docker` or: 

```bash 
cd ../ # next command uses files from parent folder
docker build . -t evonnemo -f ./evonnemo/Dockerfile
docker rm -f evonnemo && docker run --name=evonnemo -dp <port>:5173 evonnemo
```


