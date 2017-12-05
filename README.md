# Screenshot as a service
Node.js server with REST API built on top of [GoogleChrome/puppeteer](https://github.com/GoogleChrome/puppeteer).

# Running screenshot in Docker
```
cd screenshot/
sudo docker build -t screenshot .
sudo docker run -p 8787:80 screenshot .
```

# REST API
```
GET /screenshot?url={url}&x={x}&y={y}&width={width}&height={height}
```
Note - x, y, width, height must all be defined or none of them defined.
If none of them are defined it will just send back a full page sized image

# LICENSE

Screenshot is licensed under the [MIT license](./LICENSE).
GoogleChrome/puppeteer is licensed under the Apache License 2.0.
