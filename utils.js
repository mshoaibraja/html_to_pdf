const fs = require('fs')


export class Utils {
    static async sureThing(promise) {
        return promise
            .then(result => ({ ok: true, result }))
            .catch(error => Promise.resolve({ ok: false, error }))
    }

    static async access_file(file_path) {
        let local_resolve = null

        let local_promise = new Promise(res => {
            local_resolve = res
        })

        fs.access(file_path, fs.constants.F_OK, (err) => {
            if (err) local_resolve(false)
            else local_resolve(true)
        })

        return local_promise
    }

}
