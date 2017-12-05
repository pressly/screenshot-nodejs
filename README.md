# Screenshot as a service
Node.js server with REST API built on top of [GoogleChrome/puppeteer](https://github.com/GoogleChrome/puppeteer).

# Running screenshot in Docker
```
cd screenshot/
sudo docker build -t screenshot .
sudo docker run -p 8787:3000 screenshot
```

# REST API
```
GET localhost:8787/png?url={url}&x={x}&y={y}&width={width}&height={height}
```
Can be run with just width & height or x & y or none. 
Default x = 0
Default y = 0
Default width = 800
Default height = 600
# LICENSE

Screenshot is licensed under the [MIT license](./LICENSE).
GoogleChrome/puppeteer is licensed under the Apache License 2.0.
