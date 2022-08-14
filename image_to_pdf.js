const ImagesToPDF = require('images-pdf');new ImagesToPDF.ImagesToPDF().convertFolderToPDF('./pdf3', 'excercise.pdf')

// PDFDocument = require('pdfkit');
// fs = require('fs');
// path = require('path')
// doc = new PDFDocument

// //Pipe its output somewhere, like to a file or HTTP response 
// //See below for browser usage 
// doc.pipe(fs.createWriteStream('excercise.pdf'))

// fs.readdir('pdf3', (err, files) => {
//     if (err)
//         console.log(err);
//     else {
//         console.log("\nCurrent directory filenames:");
//         files.forEach((file, index) => {

//             if (index > 0) return

//             console.log(file);
//             doc.image(path.join('D:\\Projects\\experiments\\html_to_pdf\\pdf3', file), {
                
//             });
//         })
//     }
// })


// doc.end()