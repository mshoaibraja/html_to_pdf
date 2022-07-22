const fs = require("fs");
const puppeteer = require('puppeteer')

fs.readFile("./links2.json", { encoding: 'utf-8' }, async (err, data) => {
    const browser = await puppeteer.launch({ headless: true });
    if (err) console.log(err)
    else {
        let processed = 0

        const link_promises = JSON.parse(data).map((x, index) => {
            let local_resolve = null
            const promise = new Promise(resolve => local_resolve = resolve)
            return { promise, local_resolve, link: x, index }
        })


        for (const link_promise of link_promises) {
            const file_name = `./pdf/${link_promise.link.replace(/\W+/g, '_')}.pdf`
            if (fs.existsSync(`${file_name}`)) {
                link_promise.local_resolve(true)
                console.log(`${++processed}/${link_promises.length}: FOUND link = ${link_promise.link}`)
                continue
            }

            console.log(`processing link = ${link_promise.link}`)
            await printPDF(browser, link_promise)
            link_promise.promise.then(pdf => write_pdf_file({ pdf, link: link_promise.link }))
            console.log(`${++processed}/${link_promises.length}: processed link = ${link_promise.link}`)
        }

        Promise.all(link_promises.map(x => x.promise)).then(async () => {
            console.log(`${link_promises.length} links are processed`);
            await browser.close()
            console.log(`browser closed`)
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
    const pdf = await page.pdf({ format: 'A4' });

    await page.close()

    link_promse.local_resolve(pdf)
}