const PDFDocument = require('pdf-lib').PDFDocument

var pdfBuffer1 = fs.readFileSync("./pdf1.pdf"); 
var pdfBuffer2 = fs.readFileSync("./pdf2.pdf");

var pdfsToMerge = [pdfBuffer1, pdfBuffer2]

const mergedPdf = await PDFDocument.create(); 
for (const pdfBytes of pdfsToMerge) { 
    const pdf = await PDFDocument.load(pdfBytes); 
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => {
         mergedPdf.addPage(page); 
    }); 
} 

const buf = await mergedPdf.save();        // Uint8Array

let path = 'merged.pdf'; 
fs.open(path, 'w', function (err, fd) {
    fs.write(fd, buf, 0, buf.length, null, function (err) {
        fs.close(fd, function () {
            console.log('wrote the file successfully');
        }); 
    }); 
}); 