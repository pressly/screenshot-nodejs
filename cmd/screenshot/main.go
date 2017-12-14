package main

import (
	"io/ioutil"

	"github.com/pressly/screenshot"
)

/*
 * Example client usage
 * TODO: make more complex examples
 */

func main() {
	client := screenshot.New("http://localhost:3000")
	window := new([2]int)
	window[0] = 1000
	window[1] = 1000

	png, _ := client.PNG("https://golang.org/pkg/fmt/", screenshot.ScreenshotOptions{
		Window: window,
	})

	pngB, _ := ioutil.ReadAll(png)

	ioutil.WriteFile("./img.png", pngB, 0644)

	p, _ := client.PDF("https://golang.org/pkg/fmt/", screenshot.PdfOptions{})

	pdf, _ := ioutil.ReadAll(p)

	ioutil.WriteFile("./doc.pdf", pdf, 0644)

	j, _ := client.JPEG("https://golang.org/pkg/fmt/", screenshot.ScreenshotOptions{}, 100)

	jpeg, _ := ioutil.ReadAll(j)

	ioutil.WriteFile("./img.jpeg", jpeg, 0644)

}
