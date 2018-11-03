import { BrowserWindow, dialog, ipcMain } from "electron";
import * as windowStateKeeper from "electron-window-state";
import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";
import { globalApp } from "../main";
import { WindowMenu } from "./windowMenu";

export function isFile(filepath) {
    try {
        return fs.existsSync(filepath) && fs.lstatSync(filepath).isFile();
    } catch (e) {
        // No permissions
        // log(e)
        return false;
    }
}

export const EXTENSIONS = [
    "dashy",
    "json"
];

export class Window {

    protected _browserWindow: BrowserWindow;
    protected _menu: WindowMenu;
    protected _filePath: string;
    protected _ddl: string;
    private _allowClose;

    constructor() {
        const mainWindowState = windowStateKeeper({
            defaultWidth: 1024,
            defaultHeight: 768
        });
        this._browserWindow = new BrowserWindow({
            x: mainWindowState.x,
            y: mainWindowState.y,
            width: mainWindowState.width,
            height: mainWindowState.height,
            show: false
        });

        if (__dirname.indexOf("lib-cjs") >= 0) {
            this._browserWindow.loadFile("index-cjs.html");
        } else {
            this._browserWindow.loadFile("index.html");
        }

        this._browserWindow.on("close", (e) => {
            if (!this._allowClose) {
                e.preventDefault();
                this.onClose();
            }
        });

        this._browserWindow.on("closed", () => {
            this.onClosed();
        });

        this._browserWindow.once("ready-to-show", () => {
            this.setTitle("Unknown");
            this.send("DASHY:get-ddl").then(ddl => {
                this._ddl = ddl;
                this._browserWindow.show();
                mainWindowState.manage(this._browserWindow);
            });
        });

        this._menu = new WindowMenu(this);
    }

    activate() {
        this._browserWindow.show();
    }

    setTitle(title) {
        this._browserWindow.setTitle(`Dashy App - ${title}`);
    }

    filePath(): string;
    filePath(_: string): this;
    filePath(_?: string): string | this {
        if (!arguments.length) return this._filePath;
        this._filePath = _;
        this.setTitle(this._filePath);
        this._menu.updateEnabled({
            fileSave: true
        });
        return this;
    }

    send(channel: string, ...args: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            this._browserWindow.webContents.send(channel, ...args);
            ipcMain.once(`${channel}-reply`, (channel: string, ...args: any[]) => {
                resolve(args[0]);
            });
        });
    }

    readFile(filePath: string) {
        if (globalApp.exists(filePath)) {
            globalApp.activate(filePath);
        } else {
            fse.readFile(path.resolve(filePath), "utf-8").then(ddl => {
                this.filePath(filePath);
                this._ddl = ddl;
                this.send("DASHY:set-ddl", ddl);
            });
            this._menu.addRecentlyUsedDocument(filePath);
        }
    }

    writeFile(filePath: string): Promise<void> {
        return this.send("DASHY:get-ddl").then((ddl: string) => {
            if (this.filePath() && ddl !== this._ddl) {
                if (isFile(filePath)) {
                    const pathObj = path.parse(filePath);
                    pathObj.ext = ".bak";
                    fse.moveSync(filePath, path.format(pathObj), { overwrite: true });
                }
                this._ddl = ddl;
                return fse.outputFile(filePath, ddl, "utf-8");
            }
        });
    }

    isDirty(): Promise<boolean> {
        return this.send("DASHY:get-ddl").then((content: string) => {
            return content !== this._ddl;
        });
    }

    fileClear() {
        this.isDirty().then(dirty => {
            if (dirty) {
                dialog.showMessageBox(this._browserWindow, {
                    type: "question",
                    message: "Unsaved changes, continue with clear?",
                    buttons: ["Yes", "No"]
                }, async (response, checkboxChecked) => {
                    if (response === 0) {
                        await this.send("DASHY:clear");
                        this.send("DASHY:get-ddl").then(ddl => {
                            this._ddl = "";
                        });
                    }
                });
            } else {
                this.send("DASHY:clear");
                this._ddl = "";
            }
        });
    }

    fileOpen() {
        const filename = dialog.showOpenDialog(this._browserWindow, {
            properties: ["openFile"],
            filters: [{
                name: "text",
                extensions: EXTENSIONS
            }]
        });
        if (filename && filename[0] && isFile(filename[0])) {
            this.readFile(path.normalize(filename[0]));
        }
    }

    fileSave() {
        this.writeFile(this.filePath());
    }

    fileSaveAs() {
    }

    onClose() {
        this.isDirty().then(dirty => {
            if (dirty) {
                const context = this;
                dialog.showMessageBox(this._browserWindow, {
                    type: "question",
                    message: "Unsaved changes, continue with close?",
                    buttons: ["Yes", "No"]
                }, (response, checkboxChecked) => {
                    if (response === 0) {
                        context._allowClose = true;
                        context._browserWindow.close();
                    }
                });
            } else {
                this._allowClose = true;
                this._browserWindow.close();
            }
        });
    }

    onClosed() {
        this._browserWindow = null;
        globalApp.closeWindow(this);
    }
}
