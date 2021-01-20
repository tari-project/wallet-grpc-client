const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const {promisifyAll} = require("grpc-promise");

function connect(address) {
    const packageDefinition = protoLoader.loadSync(
        `${__dirname}/../protos/wallet.proto`,
        {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
        });
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    const tari = protoDescriptor.tari.rpc;
    const client = new tari.Wallet(address, grpc.credentials.createInsecure());
    promisifyAll(client, {metadata: new grpc.Metadata()});
    return client;
}

function Client(address) {
    this.inner = connect(address);

    this.getVersion = async () => {
        return await this.inner.getVersion().sendMessage();
    };

    this.getCoinbase = async (arg) => {
        return await this.inner.getCoinbase().sendMessage(arg);
    };

    this.transfer = async (arg) => {
        return await this.inner.transfer().sendMessage(arg);
    };
}

Client.connect = (address) => new Client(address)

module.exports = {
    Client,
};

// (async () => {
//     const a = Client.connect('localhost:18143');
//     const {version} = await a.getVersion();
//     console.log(version);
//     const resp = await a.getCoinbase({fee: 1, amount: 10000, reward: 123, height: 1000});
//     console.log(resp);
// })()
