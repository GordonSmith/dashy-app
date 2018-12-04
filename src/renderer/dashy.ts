import { event as d3Event } from "@hpcc-js/common";
import { Connection, Result } from "@hpcc-js/comms";
import { Dashy, Databomb, Form, LogicalFile, RoxieResult, RoxieService, WU, WUResult } from "@hpcc-js/marshaller";
import { Comms } from "@hpcc-js/other";
import { exists, scopedLogger } from "@hpcc-js/util";
import { ipcRenderer } from "electron";

const logger = scopedLogger("index.ts");

class App {
    _dashy = new Dashy();

    constructor(placeholder: string) {
        this._dashy
            .target(placeholder)
            .render()
            ;

        this._dashy.element()
            .on("drop", () => this.dropHandler(this.event()))
            .on("dragover", () => this.dragOverHandler(this.event()))
            ;

        this.parseUrl();
    }

    event() {
        return d3Event || event;
    }

    parseUrl() {
        const _url = new Comms.ESPUrl().url(document.URL);
        if (_url.param("Wuid")) {
            logger.debug(`WU Params:  ${_url.params()}`);
            const baseUrl = `${_url.param("Protocol")}://${_url.param("Hostname")}:${_url.param("Port")}`;
            logger.debug(baseUrl);
            const result = new Result({ baseUrl }, _url.param("Wuid"), _url.param("ResultName"));
            result.fetchRows().then(async (response: any[]) => {
                const ddlStr = response[0][_url.param("ResultName")];
                const ddl = JSON.parse(ddlStr);
                this._dashy.importDDL(ddl, baseUrl, _url.param("Wuid"));
            });
        } else if (_url.param("QueryID")) {
            // http://10.241.100.159:8002/WsEcl/submit/query/roxie/prichajx_govottocustomerstats.ins109_service_1/json
            // ?Protocol=http&Hostname=10.241.100.159&Port=8002&QuerySet=roxie&QueryID=prichajx_govottocustomerstats.ins109_service_1
            logger.debug(`Roxie Params:  ${JSON.stringify(_url.params())}`);
            const baseUrl = `${_url.param("Protocol") || "http"}://${_url.param("Hostname")}:${_url.param("Port")}`;
            const action = `WsEcl/submit/query/${_url.param("QuerySet")}/${_url.param("QueryID")}/json`;
            const responseID = `${_url.param("QueryID")}Response`;
            logger.debug(action);
            const connection = new Connection({ baseUrl });
            connection.send(action, {}).then(response => {
                if (exists("Results.HIPIE_DDL.Row", response[responseID]) && response[responseID].Results.HIPIE_DDL.Row.length) {
                    const ddl = JSON.parse(response[responseID].Results.HIPIE_DDL.Row[0].HIPIE_DDL);
                    this._dashy.importDDL(ddl, baseUrl, _url.param("Wuid"));
                }
            });
        } else {
            //  Lets add some demo datasoures
            const ec = this._dashy.elementContainer();
            const datasources = ec.datasources();
            const publicRoxie = new RoxieService()
                .url("http://52.210.14.156:8002")
                .querySet("roxie")
                .queryID("peopleaccounts")
                ;

            const vmRoxie = new RoxieService()
                .url("http://192.168.3.22:8002")
                .querySet("roxie")
                .queryID("peopleaccounts")
                ;

            for (const datasource of [
                new WUResult()
                    .wu(new WU()
                        .url("http://52.210.14.156:8010")
                        .wuid("W20180513-082149")
                    )
                    .resultName("Result 1")
                ,
                new LogicalFile()
                    .url("http://52.210.14.156:8010")
                    .logicalFile("progguide::exampledata::peopleaccts")
                ,
                new RoxieResult(ec)
                    .service(publicRoxie)
                    .resultName("Accounts"),
                new Databomb()
                    .payload(JSON.stringify([]))
                ,
                new Form()
                    .payload({
                        id: 770,
                        fname: "TIMTOHY",
                        lname: "SALEEMI",
                        minitial: "",
                        gender: "M",
                        street: "1734 NOSTRAND AVE # 3",
                        city: "DRACUT",
                        st: "MA",
                        zip: "01826"
                    }),
                new WUResult()
                    .wu(new WU()
                        .url("http://192.168.3.22:8010")
                        .wuid("W20171201-153452")
                    )
                    .resultName("Result 1")
                ,
                new LogicalFile()
                    .url("http://192.168.3.22:8010")
                    .logicalFile("progguide::exampledata::peopleaccts")
                ,
                new RoxieResult(ec)
                    .service(vmRoxie)
                    .resultName("Accounts")
            ]) {
                datasources.push(datasource);
            }
        }
    }

    doResize(width: number, height: number) {
        this._dashy
            .resize({ width, height })
            .lazyRender();
    }

    loadFile(file) {
        const ext = file.name.split(".").pop();
        switch (ext) {
            case "csv":
            case "tsv":
            case "json":
                break;
            default:
                alert(`Unsupported file type "${ext}".\nSupported file types are "json", "csv", "tsv".`);
                return;
        }

        const reader = new FileReader();
        const context = this;
        // Closure to capture the file information.
        reader.onload = (function (theFile) {
            const ext = theFile.name.split(".").pop();
            return function (e) {
                context._dashy.addDatabomb(theFile.name, e.target.result, ext);
            };
        })(file);

        // Read in the image file as a data URL.
        reader.readAsText(file);
    }

    dropHandler(evt) {
        console.log("File(s) dropped");

        // Prevent default behavior (Prevent file from being opened)
        evt.preventDefault();

        if (evt.dataTransfer.items) {
            // Use DataTransferItemList interface to access the file(s)
            for (let i = 0; i < evt.dataTransfer.items.length; i++) {
                // If dropped items aren't files, reject them
                if (evt.dataTransfer.items[i].kind === "file") {
                    const file = evt.dataTransfer.items[i].getAsFile();
                    console.log("... file[" + i + "].name = " + file.name);
                    this.loadFile(file);
                }
            }
        } else {
            // Use DataTransfer interface to access the file(s)
            for (let i = 0; i < evt.dataTransfer.files.length; i++) {
                console.log("... file[" + i + "].name = " + evt.dataTransfer.files[i].name);
                this.loadFile(evt.dataTransfer.files[i]);
            }
        }

        // Pass event to removeDragData for cleanup
        this.removeDragData(evt);
    }

    dragOverHandler(evt) {
        console.log("File(s) in drop zone");

        // Prevent default behavior (Prevent file from being opened)
        evt.preventDefault();
    }

    removeDragData(ev) {
        console.log("Removing drag data");

        if (ev.dataTransfer.items) {
            // Use DataTransferItemList interface to remove the drag data
            ev.dataTransfer.items.clear();
        } else {
            // Use DataTransfer interface to remove the drag data
            ev.dataTransfer.clearData();
        }
    }
}

let app: App;

window.addEventListener("resize", doResize);
function doResize() {
    let myWidth;
    let myHeight;
    if (typeof (window.innerWidth) === "number") {
        myWidth = window.innerWidth;
        myHeight = window.innerHeight;
    } else {
        if (document.documentElement && (document.documentElement.clientWidth || document.documentElement.clientHeight)) {
            myWidth = document.documentElement.clientWidth;
            myHeight = document.documentElement.clientHeight;
        } else {
            if (document.body && (document.body.clientWidth || document.body.clientHeight)) {
                myWidth = document.body.clientWidth;
                myHeight = document.body.clientHeight;
            }
        }
    }
    if (app && myWidth && myHeight) {
        app.doResize(myWidth - 16, myHeight - 16);
    }
}

export function dashy() {
    app = new App("placeholder");
    doResize();
    let ddl: string = "";
    let pathname;

    function ipcRendererOn(channel: string, callback: (...args) => any) {
        ipcRenderer.on(channel, (event, ...args: any[]) => {
            event.sender.send(`${channel}-reply`, callback(...args));
        });
    }

    ipcRendererOn("DASHY:clear", (...args: any[]) => {
        app._dashy.clear();
    });

    ipcRendererOn("DASHY:set-ddl", ddl => {
        app._dashy.restore(JSON.parse(ddl));
    });

    ipcRendererOn("DASHY:get-ddl", () => {
        return JSON.stringify(app._dashy.save());
    });

    ipcRendererOn("DASHY:import-data", (name, data, ext) => {
        app._dashy.addDatabomb(name, data, ext);
    });

    function changed(ddlObj: object) {
        return ddl !== JSON.stringify(ddlObj);
    }

    ipcRenderer.on("DASHY::open-blank-window", (event, arg) => {
        ddl = JSON.stringify(app._dashy.save());
    });

    ipcRenderer.on("DASHY::open-single-file", (event, arg) => {
        ddl = arg.markdown;
        pathname = arg.pathname;
        app._dashy.restore(JSON.parse(ddl));
    });

    ipcRenderer.on("DASHY::ask-file-save", (event, arg) => {
        const ddlObj = app._dashy.save();
        if (changed(ddlObj)) {
            ipcRenderer.send("DASHY::response-file-save", {
                id: app._dashy.id(),
                markdown: JSON.stringify(ddlObj),
                pathname,
                options: {}
            });
        }
    });

    ipcRenderer.on("DASHY::ask-file-save-as", (event, arg) => {
        const ddlObj = app._dashy.save();
        ipcRenderer.send("DASHY::response-file-save-as", {
            id: app._dashy.id(),
            markdown: JSON.stringify(ddlObj),
            pathname,
            options: {}
        });
    });

    ipcRenderer.on("DASHY::ask-for-close", (event, arg) => {
        const ddlObj = app._dashy.save();
        if (changed(ddlObj)) {
        }
        ipcRenderer.send("DASHY::close-window");
    });

    ipcRenderer.on("DASHY::is-dirty", (event, arg) => {
        return changed(app._dashy.save());
    });
}
