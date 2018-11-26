import { app, BrowserWindow, dialog, ipcMain } from "electron";
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
        const htmlPath = path.join(app.getAppPath(), "index.html");
        this._browserWindow.loadURL(`file://${htmlPath}${__dirname.indexOf("lib-cjs") >= 0 ? "?dev" : ""}`);

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
            this.clear().then(() => {
                this._browserWindow.show();
                mainWindowState.manage(this._browserWindow);
            });
        });

        this._menu = new WindowMenu(this);
    }

    activate() {
        this._browserWindow.show();
    }

    openModalUrl(url: string) {
        let modalWindow = new BrowserWindow({
            parent: this._browserWindow,
            width: 400,
            height: 400,
            useContentSize: true,
            resizable: false,
            modal: true
        });

        modalWindow.setMenu(null);

        const htmlPath = path.join(app.getAppPath(), url);
        modalWindow.loadURL(`file://${htmlPath}${__dirname.indexOf("lib-cjs") >= 0 ? "?dev" : ""}`);

        modalWindow.on("closed", function () {
            modalWindow = null;
        });
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

    readFile(filePath: string): Promise<void> {
        this._menu.addRecentlyUsedDocument(filePath);
        if (globalApp.exists(filePath)) {
            globalApp.activate(filePath);
            return Promise.resolve();
        } else {
            return fse.readFile(path.resolve(filePath), "utf-8").then(ddl => {
                this.filePath(filePath);
                this._ddl = ddl;
                return this.send("DASHY:set-ddl", ddl);
            });
        }
    }

    writeFile(filePath: string): Promise<void> {
        this._menu.addRecentlyUsedDocument(filePath);
        return this.send("DASHY:get-ddl").then((ddl: string) => {
            if (isFile(filePath)) {
                const pathObj = path.parse(filePath);
                pathObj.ext = ".bak";
                fse.moveSync(filePath, path.format(pathObj), { overwrite: true });
            }
            this.filePath(filePath);
            this._ddl = ddl;
            return fse.outputFile(filePath, ddl, "utf-8");
        });
    }

    isDirty(): Promise<boolean> {
        return this.send("DASHY:get-ddl").then((content: string) => {
            return content !== this._ddl;
        });
    }

    clear(): Promise<void> {
        return this.send("DASHY:clear").then(() => {
            return this.send("DASHY:get-ddl").then(ddl => {
                this._ddl = ddl;
            });
        });
    }

    fileClear(): Promise<void> {
        return this.querySave().then(response => {
            if (response) {
                return this.clear();
            }
        });
    }

    fileOpen(filename?: string): Promise<void> {
        return this.querySave().then(response => {
            if (response) {
                const filenames: string[] = filename !== undefined ? [filename] : dialog.showOpenDialog(this._browserWindow, {
                    properties: ["openFile"],
                    filters: [{
                        name: "text",
                        extensions: EXTENSIONS
                    }]
                });
                if (filenames && filenames[0] && isFile(filenames[0])) {
                    return this.readFile(path.normalize(filenames[0]));
                }
            }
        });
    }

    fileSave(): Promise<void> {
        if (this.filePath() === undefined) {
            return this.fileSaveAs();
        } else {
            return this.writeFile(this.filePath());
        }
    }

    fileSaveAs(): Promise<void> {
        const filename = dialog.showSaveDialog(this._browserWindow, {
            defaultPath: this.filePath(),
            filters: [{
                name: "text",
                extensions: EXTENSIONS
            }]
        });
        if (filename) {
            let doSave = true;
            if (filename !== this.filePath() && isFile(filename)) {
                doSave = dialog.showMessageBox(this._browserWindow, {
                    type: "question",
                    message: `"${filename}" already exists.\nDo you want to replace it?`,
                    buttons: ["Yes", "No"],
                    defaultId: 1
                }) === 0;
            }
            if (doSave) {
                return this.writeFile(filename);
            }
        }
        return Promise.resolve();
    }

    querySave(): Promise<boolean> {
        return this.isDirty().then(dirty => {
            if (dirty) {
                const response = dialog.showMessageBox(this._browserWindow, {
                    type: "question",
                    message: `Do you want to save changes to "${this.filePath()}"?`,
                    buttons: ["Save", "Don't Save", "Cancel"]
                });
                switch (response) {
                    case 0:
                        return this.fileSave().then(() => true);
                    case 1:
                        return true;
                    case 2:
                    default:
                        return false;
                }
            }
            return true;
        });
    }

    onClose() {
        this.querySave().then(response => {
            if (response) {
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
