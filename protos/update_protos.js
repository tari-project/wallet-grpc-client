const path = require('path');
const fetch = require('node-fetch');
const md5 = require('md5');
const fs = require('fs').promises;

const branch = process.env.BRANCH || 'development';

const srcUrls = [
    `https://raw.githubusercontent.com/tari-project/tari/${branch}/applications/tari_app_grpc/proto/types.proto`,
    `https://raw.githubusercontent.com/tari-project/tari/${branch}/applications/tari_app_grpc/proto/wallet.proto`,
];

const destination = __dirname;

async function download(srcUrl, destPath) {
    const remoteContents = await fetch(srcUrl).then(resp => resp.text());
    const remoteHash = md5(remoteContents)
    const localContents = (await Result.fromPromise(fs.readFile(destPath))).expect("Failed to read dest");
    const localHash = md5(localContents)

    if (localHash === remoteHash) {
        return false;
    }

    (await Result.fromPromise(fs.writeFile(destPath, remoteContents))).expect("Failed to write file");
    return true;
}

function Result(ok, err) {
    const _ok = ok;
    const _err = err;

    this.ok = () => _ok;
    this.err = () => _err;
    this.expect = (msg) => {
        if (this.err()) {
            throw new Error(`${msg ? `${msg}: ` : ''}${this.err()}`);
        }
        return this.ok();
    }
}

Result.Ok = (ok) => new Result(ok);
Result.Err = (err) => new Result(undefined, err);
Result.fromPromise = (promise) => promise.then(Result.Ok).catch(Result.Err);

async function syncAll() {
    for (const srcUrl of srcUrls) {
        const fileName = path.basename(srcUrl);
        process.stdout.write(`Downloading ${fileName}... `);
        const dest = path.join(destination, fileName);
        const result = await Result.fromPromise(download(srcUrl, dest));
        if (typeof result.ok() !== "undefined") {
            if (result.ok()) {
                process.stdout.write('✅  Updated\n');
            } else {
                process.stdout.write('◽  No change️\n');
            }
        } else {
            process.stdout.write('❌  Failed\n');
            console.error(result.err());
            process.exit(1);
        }
    }
}

(function () {
    try {
        syncAll()
            .then(() => {
                console.log("Done.");
            })
            .catch(console.error);
    } catch (err) {
        console.error(err);
    }

})();