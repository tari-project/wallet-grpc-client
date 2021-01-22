const path = require('path');
const fetchRemote = require('node-fetch');
const md5 = require('md5');
const fs = require('fs').promises;

const branch = process.env.BRANCH || 'development';

const destination = __dirname;

async function fetch(url) {
    if (url.startsWith("file://")) {
        return await fs.readFile(url.substr(7));
    }
    return await fetchRemote(url).then(r => r.text());
}

async function download(srcUrl, destPath) {
    const remoteContents = await fetch(srcUrl);
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

async function syncAll(srcUrls) {
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

function main(args) {
    let srcUrls = [];
    if (args.length == 0) {
        srcUrls = [
            `https://raw.githubusercontent.com/tari-project/tari/${branch}/applications/tari_app_grpc/proto/types.proto`,
            `https://raw.githubusercontent.com/tari-project/tari/${branch}/applications/tari_app_grpc/proto/wallet.proto`,
        ];
    } else {
        srcUrls = args;
        console.log(`Using custom URLS, ${srcUrls.join(", ")}`);
    }

    try {
        syncAll(srcUrls)
            .then(() => {
                console.log("Done.");
            })
            .catch(console.error);
    } catch (err) {
        console.error(err);
    }
}

main(process.argv.slice(2));
