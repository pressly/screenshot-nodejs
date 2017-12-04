const express = require('express')
const puppeteer = require('puppeteer')
const cookieParser = require('cookie-parser')
const app = express()
const port = 80

const browser = puppeteer.launch({
  args: [
      '--no-sandbox',
      '--disable-setuid-sandbox'
  ]
}).catch(console.log)

app.use(cookieParser())

app.get('/screenshot', (req, res) => {
  let { url, width, height, x, y } = req.query
  if (!url)
    res.status(422)
      .send('need a url')

  width = parseInt(width, 10)
  height = parseInt(height, 10)
  x = parseInt(x, 10)
  y = parseInt(y, 10)

  browser.then(async (browser) => {
    let page
    try { 
      page = await browser.newPage()
      await page.goto(url, { waitUntil: 'networkidle2' })
      let options = { fullpage: true }
      if (x && y && width && height)
        options = {
          clip: { x, y, width, height }
        }
      return await page.screenshot(options)    
    } finally {
      if (page)
        await page.close()
    }
    })
    .catch(e => {
      res.status(500)
        .send(`Puppeteer Failed 
          - url: ${url} 
          - width: ${width} 
          - height: ${height} 
          - x: ${x} 
          - y: ${y} 
          - stacktrace: \n\n${e.stack}`)
    })
    .then(img => {
      res.set('Content-type', 'image/png').send(img)
    })
    
})

app.listen(port, () => console.log(`server listening on port ${port}`))