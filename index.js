const fs = require("fs");
const puppeteer = require('puppeteer')
const PDFDocument = require('pdf-lib').PDFDocument
const { Utils } = require("./utils.js")

export class Crawler {
    constructor(config_file) {
        this.config_file = config_file

        this.global_list = []
        let sets = []

        fs.readFile("./links.json", { encoding: 'utf-8' }, async (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            else {
                sets = JSON.parse(data)
            }
        })

        if (sets.length > 0) {
            this.browser = await puppeteer.launch({ headless: true });
            this.sets = sets.filter(set => set.process === true)
        }
    }

    async start() {
        this.sets.forEach(async (set) => {
            let processed = 0

            const link_promises = set.links.map((link, index) => {
                let local_resolve = null
                const promise = new Promise(resolve => local_resolve = resolve)
                return { promise, local_resolve, link, index, options: set }
            })

            this.global_list = this.global_list.concat(link_promises)
            this.global_list.merge_files = set.merge_files
            this.global_list.merged_file_name = set.merged_file_name
            this.global_list.target_directory = set.target_directory

            for (const link_promise of link_promises) {
                let file_name = ''

                file_name = `./${set.target_directory}/${link_promise.link.replace(/\W+/g, '_')}.pdf`

                const found = await Utils.sureThing(Utils.access_file(`${file_name}`))

                if (found.ok && found.result === true) {
                    link_promise.local_resolve(true)
                    console.log(`${++processed}/${link_promises.length}: FOUND link = ${link_promise.link}`)
                    continue
                }

                console.log(`processing link = ${link_promise.link}`)

                await this.printPDF(link_promise)
                link_promise.promise.then(async (result) => await this.write_pdf_file({ dir_name: set.target_directory, pdf: result.pdf, link: link_promise.link }))


                console.log(`${++processed}/${link_promises.length}: processed link = ${link_promise.link}`)
            }
        })
    }

    async write_pdf_file({ dir_name, link, pdf }) {
        const file_name = `./${dir_name}/${link.replace(/\W+/g, '_')}.pdf`

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

    async printPDF(link_promse) {
        const page = await this.browser.newPage();

        await page.goto(link_promse.link, { waitUntil: 'networkidle0', timeout: 180000 });


        // if (link_promse.options.filter_function) {
        //     await page.evaluate(modify_content)
        // }

        const pdf = await page.pdf({ format: link_promse.options.page_size || "A4" });
        await page.close()
        link_promse.local_resolve({ pdf, link_promse, options: link_promse.options })
    }


}

fs.readFile("./links.json", { encoding: 'utf-8' }, async (err, data) => {

    if (err) console.log(err)
    else {
        // const custom_flags = puppeteer.defaultArgs().join(flags)
        const browser = await puppeteer.launch({ headless: true });
        let global_list = []

        const sets = JSON.parse(data)

        sets.forEach(async (set) => {

            if (set.process === false) return

            let processed = 0

            const link_promises = set.links.map((link, index) => {
                let local_resolve = null
                const promise = new Promise(resolve => local_resolve = resolve)
                return { promise, local_resolve, link, index, options: set }
            })

            global_list = global_list.concat(link_promises)
            global_list.merge_files = set.merge_files
            global_list.merged_file_name = set.merged_file_name
            global_list.target_directory = set.target_directory

            for (const link_promise of link_promises) {
                let file_name = ''

                file_name = `./${set.target_directory}/${link_promise.link.replace(/\W+/g, '_')}.pdf`

                if (fs.existsSync(`${file_name}`)) {
                    link_promise.local_resolve(true)
                    console.log(`${++processed}/${link_promises.length}: FOUND link = ${link_promise.link}`)
                    continue
                }

                console.log(`processing link = ${link_promise.link}`)

                await printPDF(browser, link_promise)
                link_promise.promise.then(result => write_pdf_file({ dir_name: set.target_directory, pdf: result.pdf, link: link_promise.link }))


                console.log(`${++processed}/${link_promises.length}: processed link = ${link_promise.link}`)


            }
        })


        Promise.all(global_list.map(x => x.promise)).then(async () => {
            console.log(`${global_list.length} links are processed`);
            await browser.close()
            console.log(`browser closed`)

            if (global_list.merge_files) {
                console.log(`trying to merge pdf files`)
                await merge_files(global_list.target_directory, global_list.merged_file_name)
                console.log(`files are merged`)
            }

        })
    }

})

async function merge_files(dir_name, file_name) {
    const files = fs.readdirSync(dir_name)
    const pdfsToMerge = [];
    for (var file of files) {
        pdfsToMerge.push(fs.readFileSync(`./${dir_name}/${file}`))
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

    let path = file_name;
    fs.open(path, 'w', function (err, fd) {
        fs.write(fd, buf, 0, buf.length, null, function (err) {
            fs.close(fd, function () {
                console.log('wrote the file successfully');
            });
        });
    });
}

function remove_extra_parts() {
    const parts = Array.from(document.querySelectorAll('.stamp,.level-2'))
    console.log(`${parts.length} parts found`)
    parts.forEach(x => x.remove())
}

function hide_content() {

    const parts = Array.from(document.querySelectorAll('.stamp,.level-2'))
    console.log(`${parts.length} parts found`)
    parts.forEach(x => x.style.display = 'none')

    //
    //section#code-window
    document.querySelector('section#code-window').style.fontSize = 'smaller'
    document.querySelector('#sketch-container').style.display = 'none'

    document.querySelector('header').remove()
    document.querySelector('#code-window').style.marginTop = '0px';
    const code = document.querySelector('code').innerText
    document.querySelector('code').innerHTML = code.replace(/\\n/g, '<br/>')

}

function modify_content() {
    document.head.remove()
    const title_node = document.querySelector('.exercise-description')

    if (title_node) {
        var title = title_node.innerText.replace(/\n/g, ' : ')
    } else {
        title = ""
    }

    var raw = document.querySelector('.language-java').innerText

    var updated = raw.replace(/\n/g, '<br/>')
    document.querySelector('.code-container').innerHTML = updated

    document.querySelector('body').innerHTML = `<h3 style="margin:20px">${title}</h3>
    <p style="margin: 20px 20px; border: solid 1px black">${updated}</p>
    `
}