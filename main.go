package main

import (
	"image"
	"image/png"
	"io/ioutil"
	"os"
	screenshot "screenshot/lib"
)

/*
 * Example client usage
 */

func main() {
	client := screenshot.New("http://localhost:3000")
	r, err := client.PNG("https://golang.org/pkg/fmt/", screenshot.Page{
		Window: &[2]int{1000, 1000},
	})
	if err != nil {
		panic(err)
	}

	img, _, _ := image.Decode(r)

	out, err := os.Create("./img.png")
	if err != nil {
		panic(err)
	}

	err = png.Encode(out, img)

	p, _ := client.PDF("https://golang.org/pkg/fmt/", screenshot.Page{}, screenshot.PdfOptions{})

	pdf, _ := ioutil.ReadAll(p)

	ioutil.WriteFile("./doc.pdf", pdf, 0644)

	j, _ := client.JPEG("https://golang.org/pkg/fmt/", screenshot.Page{}, 100)

	jpeg, _ := ioutil.ReadAll(j)

	ioutil.WriteFile("./img.jpeg", jpeg, 0644)

}
