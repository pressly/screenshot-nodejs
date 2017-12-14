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
	window := &screenshot.Window{
		Width:  1000,
		Height: 1000,
	}
	crop := &screenshot.Crop{
		Width:  100,
		Height: 100,
		X:      50,
		Y:      70,
	}
	headers := map[string]string{
		"Key": "Value",
	}

	png, err := client.PNG("https://golang.org/pkg/fmt/", screenshot.ImgOptions{
		Window:    window,
		Crop:      crop,
		Headers:   headers,
		WaitUntil: "networkidle0",
	})

	defer png.Close()

	if err != nil {
		panic(err)
	}

	pngB, err := ioutil.ReadAll(png)

	if err != nil {
		panic(err)
	}

	ioutil.WriteFile("./img.png", pngB, 0644)

	scale := new(float32)
	*scale = 1.0

	pdf, err := client.PDF("https://golang.org/pkg/fmt/", screenshot.PdfOptions{
		PrintBackground:     true,
		PageRanges:          "1,2",
		DisplayHeaderFooter: true,
		Format:              "A5",
		Landscape:           true,
		Scale:               scale,
		Path:                "./out.pdf",
		WaitUntil:           "load",
		Margin: &screenshot.Margin{
			Top: "10", Bottom: "55px", Left: "94%", Right: "20",
		},
		Window: window,
	})

	defer pdf.Close()

	if err != nil {
		panic(err)
	}

	pdfB, err := ioutil.ReadAll(pdf)

	if err != nil {
		panic(err)
	}

	ioutil.WriteFile("./doc.pdf", pdfB, 0644)

	jpeg, err := client.JPEG("https://golang.org/pkg/fmt/", screenshot.ImgOptions{}, 100)

	defer jpeg.Close()

	if err != nil {
		panic(err)
	}

	jpegB, err := ioutil.ReadAll(jpeg)

	if err != nil {
		panic(err)
	}

	ioutil.WriteFile("./img.jpeg", jpegB, 0644)

}
