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
        //let url: string = `http://sms.ru/sms/send?api_id=${this.token}&to=${this.phone}&text=${message}`;
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
    tempLimit: number = 78;
    private stat: Stat;

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

    private _isOnline: boolean = true;
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

    updateRigStatus(stat: Stat) {
        console.log(this.name);
        console.log(stat.hashRate);
        console.log(stat.temps);

        this.stat = stat;
        this.temp = Math.max.apply(null, stat.temps);
    }


    toString() {
        console.log(this.name);
        console.log(this.stat.hashRate);
        console.log(this.stat.temps);
        let msg: string = this.name + ": " + this._temp + ";";
        return msg;
    }

    constructor(name: string, ip: string, port: number) {
        super();
        this.name = name;
        this.ip = ip;
        this.port = port;
    }
}

class Stat {
    hashRate: string;
    temps: number[] = new Array();
    constructor(stat: string) {
        let json: any = JSON.parse(stat);
        this.hashRate = json.result[2].split(';')[0];
        let tempFan = json.result[6].split(';');
        for (var i = 0; i < tempFan.length; i += 2) {
            this.temps.push(tempFan[i]);
        }
    }
}

function updateRigStatus(rig: Rig, stat: Stat) {
    console.log(rig.name);
    console.log(stat.hashRate);
    console.log(stat.temps);

    rig.temp = Math.max.apply(null, stat.temps);
}

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

    rig.on('criticalTempStatusChanged', (err) => {
        let msg: string = rig.isCriticalTemp
            ? `${rig.name}: critical temp ${rig.temp}C`
            : `${rig.name}: normal temp ${rig.temp}C`;

        console.log(msg)
        if (rig.name === "rig1" || rig.name === "rig2")
            smsNotifier.sendMessage(msg, user1.sms);
        viberNotifier.sendMessage(msg, user1.viber);
    });
}

function checkRigs() {
    for (let rig of rigs) {
        var s = socket.Socket();
        s.setEncoding('ascii');

        s.on('data', function (d) {
            rig.isOnline = true;
            let stat: Stat = new Stat(d);
            rig.updateRigStatus(stat);
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

function sendStat() {
    let msg: string = "";
    for (let rig of rigs) {
         msg += rig.toString() + "\n";
    }
    viberNotifier.sendMessage(msg, user1.viber);
}

const cron = require('node-cron');
var checkRigTask = cron.schedule('*/1 * * * *', function () {
    checkRigs();
});
checkRigTask.start();

var sendStatTask = cron.schedule('0 21 * * *', function () {
    sendStat();
});
sendStatTask.start();