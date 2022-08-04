const fs = require("fs");
const puppeteer = require('puppeteer')
const PDFDocument = require('pdf-lib').PDFDocument

const pdf_config = {
    dir_name: "pdf",
    format: "A4",

    debug: false // we don't print at all 
}

const flags = [
    '--force-device-scale-factor=.75'
]

fs.readFile("./links.json", { encoding: 'utf-8' }, async (err, data) => {

    if (err) console.log(err)
    else {
        const custom_flags = puppeteer.defaultArgs().join(flags)
        const browser = await puppeteer.launch(custom_flags);
        let global_list = []

        const links_hash = JSON.parse(data)

        Object.keys(links_hash).forEach(async (dir_name) => {
            let processed = 0

            const link_promises = links_hash[dir_name].map((link, index) => {
                let local_resolve = null
                const promise = new Promise(resolve => local_resolve = resolve)
                return { promise, local_resolve, link: link.url, index, options: link.options }
            })

            global_list = global_list.concat(link_promises)

            for (const link_promise of link_promises) {
                const file_name = `./${pdf_config.dir_name}/${link_promise.link.replace(/\W+/g, '_')}.pdf`
                if (fs.existsSync(`${file_name}`)) {
                    link_promise.local_resolve(true)
                    console.log(`${++processed}/${link_promises.length}: FOUND link = ${link_promise.link}`)
                    continue
                }

                console.log(`processing link = ${link_promise.link}`)
                //await printPDF(browser, link_promise)
                await takeScreenshot(browser, link_promise)
                //link_promise.promise.then(pdf => write_pdf_file({ pdf, link: link_promise.link }))
                console.log(`${++processed}/${link_promises.length}: processed link = ${link_promise.link}`)


            }
        })


        Promise.all(global_list.map(x => x.promise)).then(async () => {
            console.log(`${global_list.length} links are processed`);
            await browser.close()
            console.log(`browser closed`)

            // console.log(`trying to merge pdf files`)
            // await merge_files()
            // console.log(`files are merged`)
        })
    }

})

async function write_pdf_file({ link, pdf }) {
    const file_name = `./pdf/${link.replace(/\W+/g, '_')}.pdf`

    fs.writeFile(file_name, pdf, {
        encoding: 'binary'
    }, (err) => {
        if (err) {
            console.log(`ERROR`)
            console.log(err)
        }
        else
            console.log(`${file_name} is written`)
    })
}


async function printPDF(browser, link_promse) {
    const page = await browser.newPage();

    await page.goto(link_promse.link, { waitUntil: 'networkidle0', timeout: 180000 });

    if (!pdf_config.debug) {
        const pdf = await page.pdf({ format: link_promse.options.format ? link_promse.options.format : pdf_config.format });
        await page.close()
        link_promse.local_resolve(pdf)
    } else {

    }

}

async function takeScreenshot(browser, link_promse) {
    const page = await browser.newPage();

    await page.goto(link_promse.link, { waitUntil: 'networkidle0', timeout: 180000 });   
    await page.setViewport({width: 0, height: 0, deviceScaleFactor:.75}); 

    const screen = await page.screenshot({
        path: `${link_promse.link.replace(/\W/g, '_')}.jpeg`,
        fullPage: true
    })

    await page.close()
    link_promse.local_resolve(screen)
}

async function merge_files() {
    const files = fs.readdirSync(pdf_config.dir_name)
    const pdfsToMerge = [];
    for (var file of files) {
        pdfsToMerge.push(fs.readFileSync(`./${pdf_config.dir_name}/${file}`))
    }

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
}