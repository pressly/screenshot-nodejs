import { Browser, Page } from 'puppeteer'
import * as puppeteer from 'puppeteer'
import * as sleep from 'sleep-promise'

interface BrowserOptions {
  args: string[]
}

export default class BrowserProxy {
  _browsers: Promise<Browser | void>[]
  readonly numBrowsers: number
  readonly options: BrowserOptions
  constructor(options: BrowserOptions, numBrowsers: number) {
    this._browsers = []
    this.options = options
    this.numBrowsers = numBrowsers

    for (let i = 0; i < numBrowsers; i++)
      this._browsers.push(puppeteer.launch(options).catch(console.log))

    this._startCleanUp()
  }

  async _startCleanUp() {
    while (true) {
      const browsers = await Promise.all<Browser | void>(this._browsers)
      browsers.forEach(async (browser, i) => {
        if (!browser) 
          this._browsers[i] = puppeteer.launch(this.options).catch(console.log)
        
        const pages = await (browser as Browser).pages()
        const length = pages.length
        if (length > 2)
          pages.forEach((page, i) => {
            if (i < length - 1) // don't close the last page (could be in use)
              page.close()
          })
      })
      await sleep(30 * 1000)
    }
  }

  async newPage() {
    const { browser, pages } = await this._getFreestBrowser()
    
    if (pages.length <= 1) {
      return browser.newPage()
    } else { // browser already rendering a page
      await sleep(50)
      return this.newPage()
    } 
  }

  async _getFreestBrowser() {
    const browsers = await Promise.all<Browser | void>(this._browsers)
    
    const freestBrowser: {
      browser: Browser, pages: Page[]
    } = await browsers.reduce(async (prevBrowser, browser) => {
      const prev = await prevBrowser
      if (!browser)
        return prev // this is just to fix type issues, should never happen

      const pages = await browser.pages()

      
      if (Object.keys(prev).length === 0 || pages.length < prev.pages.length)
        return { pages, browser }
      else
        return prev
    }, Promise.resolve({}) as Promise<{ browser: Browser, pages: Page[] }>)

    return freestBrowser
  }
}
