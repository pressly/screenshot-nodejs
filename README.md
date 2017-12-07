# Screenshot as a service
Node.js server with REST API built on top of [GoogleChrome/puppeteer](https://github.com/GoogleChrome/puppeteer).

# Running screenshot in Docker
```
cd screenshot/
sudo docker build -t screenshot .
sudo docker run -p 8787:3000 screenshot
```
Set the number of browsers running in `Dockerfile` as an argument to server.js

# REST API
```
GET localhost:8787/png?url={url}&x={x}&y={y}&window={width}x{height}&crop={width}x{height}
```
example 
```
GET localhost:8787/png?url=https://www.google.com&window=500x500&crop=75x80&x=350&y=190
```
![alt text](https://i.imgur.com/i1SSbLM.png)
# LICENSE

Screenshot is licensed under the [MIT license](./LICENSE).
GoogleChrome/puppeteer is licensed under the Apache License 2.0.
