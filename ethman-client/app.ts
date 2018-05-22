const socket = require('net');
import events = require('events');

class Rig extends events.EventEmitter {
    ip: string;
    port: number;
    name: string;
    tempLimit: number = 78;

    private _temp: number;
    get temp(): number {
        return this._temp;
    }
    set temp(temp: number) {
        this._temp = temp;
        this.isCriticalTemp = this._temp >= this.tempLimit;
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

    constructor(ip: string, port: number, name: string) {
        super();
        this.ip = ip;
        this.port = port;
        this.name = name;
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

let rig0: Rig = new Rig('178.72.90.XXX', 3333, "rig0");
let rig1: Rig = new Rig('178.72.90.XXX', 3334, "rig1");
let rig2: Rig = new Rig('178.72.90.XXX', 3335, "rig2");
let rigs: Rig[] = [rig0, rig1, rig2];

for (let rig of rigs) {
    rig.on('onlineStatusChanged', (err) => {
        if (rig.isOnline)
            console.log(`${rig.name}: online`)
        else
            console.log(`${rig.name}: OFFLINE!`)
    });

    rig.on('criticalTempStatusChanged', (err) => {
        if (rig.isCriticalTemp)
            console.log(`${rig.name}: Temperature ${rig.temp}C CRITICAL!`)
        else
            console.log(`${rig.name}: Temperature ${rig.temp}C ok`)
    });
}

for (let rig of rigs) {
    var s = socket.Socket();
    s.setEncoding('ascii');

    s.on('data', function (d) {
        rig.isOnline = true;
        let stat: Stat = new Stat(d)
        updateRigStatus(rig, stat)
    });

    s.on('error', (err) => {
        rig.isOnline = false;
    });

    s.connect(rig.port, rig.ip);
    s.write('{"id":0,"jsonrpc":"2.0","method":"miner_getstat1"}');
    s.end();
}