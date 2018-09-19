const socket = require('net');
import events = require('events');

// module notifier begin
const request = require('request');
const Https = require('https');
//const HttpsProxyAgent = require('https-proxy-agent');

class User {
    name: string;
    sms: string;
    viber: string;
}

class Notifier {
    name: string;
    sendMessage(message: string, user: string): void {
        console.log("Default implementation");
    }
}

//class TelegramNotifier extends Notifier {
//    token: string;
//    chatID: string;

//    init(name: string, token: string, chatID: string): void {
//        this.name = name;
//        this.token = token;
//        this.chatID = chatID;
//    }

//    sendMessage(message: string): void {
//        if (message === undefined) {
//            return;
//        }
//        message = this.bold("• " + this.name + " •") + '\n' + message;
//        message = message.replace("+", "%2B");
//        let url: string = `https://api.telegram.org/bot${this.token}/sendMessage?chat_id=${this.chatID}&text=${message}&parse_mode=html`;

//        request(url, { json: true }, (err, res, body) => {
//            if (err) { return console.log(err); }
//        });


//        //var agent = new HttpsProxyAgent({
//        //    proxyHost: '188.166.214.xxx',
//        //    proxyPort: 1088
//        //});

//        //Https.request({
//        //    // like you'd do it usually...
//        //    host: 'api.telegram.org',
//        //    port: 443,
//        //    method: 'GET',
//        //    path: '/',
//        //    agent: agent
//        //}, function (res) {
//        //    res.on('data', function (data) {
//        //        console.log(data.toString());
//        //    });
//        //}).end();

//    }

//    bold(message: string): string {
//        if (message === undefined) {
//            return;
//        }
//        return `<b>${message}</b>`;
//    }
//}

class ViberNotifier extends Notifier {
    token: string;

    init(name: string, token: string): void {
        this.name = name;
        this.token = token;
    }

    sendMessage(message: string, user: string): void {
        if (message === undefined) {
            return;
        }
        message = message.replace("+", "%2B");
        let url: string = "https://script.google.com/macros/s/AKfycbyKbHQbk_cHIeS7QIy4J1JupBnVdFtE_Faa2bi_m2k8ISzpNzvh/exec";
        let options: string = `?text=${message}&user=${user}&token=${this.token}&sender=${this.name}`;
        let req = url + options;

        request(req, { json: true }, (err, res, body) => {
           // console.log(body)
            if (err) { return console.log(err); }
        });
    }
}


class SmsNotifier extends Notifier {
    token: string;

    init(name: string, token: string): void {
        this.name = name;
        this.token = token;
    }

    sendMessage(message: string, user: string): void {
        if (message === undefined) {
            return;
        }
        message = message.replace("+", "%2B");
        let url: string = `http://sms.ru/sms/send?api_id=${this.token}&to=${user}&text=${message}`;

        request(url, { json: true }, (err, res, body) => {
            if (err) { return console.log(err); }
        });
    }
}
// module notifier end

const jsonfile = require('jsonfile');

function readRigs(path: string): Rig[] {
    let jsonRigs: any = jsonfile.readFileSync(path);
    let rigs: Rig[] = new Array<Rig>();
    for (let jsonRig of jsonRigs) {
        let rig: Rig = new Rig(jsonRig.name, jsonRig.ip, jsonRig.port);
        rigs.push(rig);
    }
    return rigs;
}

class Rig extends events.EventEmitter {
    name: string;
    ip: string;
    port: number;
    gpus: Gpu[] = new Array();

    private _isOnline: boolean = false;
    get isOnline(): boolean {
        return this._isOnline;
    }
    set isOnline(isOnline: boolean) {
        if (isOnline == this._isOnline) {
            return;
        }

        this._isOnline = isOnline;
        this.emit('onlineStatusChanged')
    }

    updateStatusFromJson(stat: string) {
        let json: any = JSON.parse(stat);
        //this.hashRate = json.result[2].split(';')[0];
        let tempFan = json.result[6].split(';');
        //this.temp = -999;

        for (var i = 0; i < this.gpus.length; i++) {
            this.gpus[i].temp = tempFan[i * 2];
            this.gpus[i].fan = tempFan[i * 2 + 1];
        }
    }

    initGpu(count: number) {
        for (var id = 0; id < count; id++) {
            this.gpus.push(new Gpu(id));
        }
    }

    toString() {
        //console.log(this.name);
        //console.log(this._stat.hashRate);
        //console.log(this.temperature());
        //let eventsMsg: string;
        //eventsMsg +=
        let msg: string = this.name + ": " + this.temperature() + ";";
        return msg;
    }

    temperature(): number {
        let maxTemperature: number = -999;
        for (let gpu of this.gpus) {
            maxTemperature = Math.max(maxTemperature, gpu.temp);
        }

        return maxTemperature;
    }

    constructor(name: string, ip: string, port: number) {
        super();
        this.name = name;
        this.ip = ip;
        this.port = port;
    }
}

class Gpu extends events.EventEmitter{
    tempLimit: number = 78;

    id: number;
    hashRate: string;

    private _fan: number;
    get fan(): number {
        return this._fan;
    }
    set fan(fan: number) {
        this._fan = fan;

        this.isFanFailure = ((this._fan <= 40) && (this._temp >= 60));
    }

    private _temp: number;
    get temp(): number {
        return this._temp;
    }
    set temp(temp: number) {
        this._temp = temp;

        this.isCriticalTemp = (!this.isCriticalTemp && this._temp >= this.tempLimit) ||
            (this.isCriticalTemp && this._temp >= this.tempLimit - 8);
    }

    private _isCriticalTemp: boolean = false;
    get isCriticalTemp(): boolean {
        return this._isCriticalTemp;
    }
    set isCriticalTemp(isCriticalTemp: boolean) {
        if (isCriticalTemp == this._isCriticalTemp) {
            return;
        }

        this._isCriticalTemp = isCriticalTemp;
        this.emit('criticalTempStatusChanged')
    }

    private _isFanFailure: boolean = false;
    get isFanFailure(): boolean {
        return this._isFanFailure;
    }
    set isFanFailure(isFanFailure: boolean) {
        if (isFanFailure == this._isFanFailure) {
            return;
        }

        this._isFanFailure = isFanFailure;
        this.emit('fanFailureStatusChanged')
    }

    constructor(id: number) {
        super();
        this.id = id;
    }
}

//function updateRigStatus(rig: Rig, stat: Stat) {
//    console.log(rig.name);
//    console.log(stat.hashRate);
//    console.log(stat.temps);

//    rig.temp = Math.max.apply(null, stat.temps);
//}

let smsNotifier: SmsNotifier = new SmsNotifier();
smsNotifier.init("sms", "cd486eb0-6f4f-f044-4563-ba577c7da3dd");

let viberNotifier: ViberNotifier = new ViberNotifier();
viberNotifier.init("Rig monitor", "47e9a0ae1067d237-a4cde21dd91379f-175166e01c4098cd", );

let user1: User = new User();
user1.sms = "9829112723";
user1.viber = "doedipEwGBmCivjBm6uwRg==";

//let user2: User = new User();
//user2.sms = "9829112723";
//user2.viber = "doedipEwGBmCivjBm6uwRg==";

let rigs: Rig[] = readRigs('rigs.json');

// Subscribe
for (let rig of rigs) {
    rig.on('onlineStatusChanged', (err) => {
        let msg: string = rig.isOnline
            ? `${rig.name}: online`
            : `${rig.name}: offline`;

        console.log(msg)
        if (rig.name === "rig1" || rig.name === "rig2")
            smsNotifier.sendMessage(msg, user1.sms);
        viberNotifier.sendMessage(msg, user1.viber);
    });

    for (let gpu of rig.gpus) {
        gpu.on('criticalTempStatusChanged', (err) => {
            let msg: string = gpu.isCriticalTemp
                ? `${rig.name}.GPU${gpu.id}: critical temp ${gpu.temp}C`
                : `${rig.name}.GPU${gpu.id}: normal temp ${gpu.temp}C`;

            console.log(msg)
            notifyUsers(rig, msg);
        });

        gpu.on('fanFailureStatusChanged', (err) => {
            let msg: string = gpu.isCriticalTemp
                ? `${rig.name}.GPU${gpu.id}: fan failure ${gpu.fan}%`
                : `${rig.name}.GPU${gpu.id}: fan OK ${gpu.fan}}%`;

            console.log(msg)
            notifyUsers(rig, msg);
        });
    }
}

function notifyUsers(rig: Rig, msg: string) {
    if (rig.name === "rig1" || rig.name === "rig2")
        smsNotifier.sendMessage(msg, user1.sms);
    viberNotifier.sendMessage(msg, user1.viber);
}

function checkRigs() {
    for (let rig of rigs) {
        var s = socket.Socket();
        s.setEncoding('ascii');

        s.on('data', function (d) {
            rig.isOnline = true;
            rig.updateStatusFromJson(d);
        });

        s.on('error', (err) => {
            console.log(err.code);
            rig.isOnline = false;
        });

        s.connect(rig.port, rig.ip);
        s.write('{"id":0,"jsonrpc":"2.0","method":"miner_getstat1"}');
        s.end();
    }
}

const sendStat = async () => {
    let msg: string = "";
    for (let rig of rigs) {
        if (rig.isOnline)
            msg += rig.toString() + "\n";
    }
    viberNotifier.sendMessage(msg, user1.viber);
}

sendStat().catch(err => {
    console.log(err);
    console.log("sendStat CATCH!");
})

const cron = require('node-cron');
var checkRigTask = cron.schedule('*/3 * * * *', function () {
    checkRigs();
});
checkRigTask.start();
checkRigs();

var sendStatTask = cron.schedule('0 16 * * *', function () {
    sendStat();
});
sendStatTask.start();