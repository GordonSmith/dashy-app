import { app } from "electron";
import * as prompt from "electron-prompt";
import { Window } from "./main/window";

let authPromise;
let userID = "";
let userPW = "";

class App {
    private _windows: Window[] = [];

    constructor() {
        app.on("ready", () => {
            this.createWindow();
        });

        app.on("window-all-closed", () => {
            if (process.platform !== "darwin") {
                app.quit();
            }
        });

        app.on("activate", () => {
            if (this._windows.length === 0) {
                this.createWindow();
            }
        });

        app.on("login", (event, webContents, request, authInfo, callback) => {
            event.preventDefault();
            if (!authPromise) {
                authPromise = new Promise((resolve, reject) => {
                    prompt({
                        title: "Authentication",
                        label: "User ID:",
                        value: userID,
                        height: 160,
                        inputAttrs: {
                            type: "text"
                        }
                    }).then(r => {
                        if (r === null) throw new Error("User Cancelled");
                        userID = r;
                    }).then(() => {
                        return prompt({
                            title: "Authentication",
                            label: "Password:",
                            value: userPW,
                            height: 150,
                            inputAttrs: {
                                type: "password"
                            }
                        });
                    }).then(r => {
                        if (r === null) throw new Error("User Cancelled");
                        userPW = r;
                        resolve([userID, userPW]);
                    });
                });
            }
            authPromise.then(([userID2, userPW2]) => {
                callback(userID, userPW);
                authPromise = undefined;
            }).catch(console.error);
        });
    }

    createWindow() {
        this._windows.push(new Window());
    }

    closeWindow(win: Window) {
        const idx = this._windows.indexOf(win);
        if (idx >= 0) {
            this._windows.splice(idx, 1);
        }
    }

    exists(filePath: string): boolean {
        return this.locate(filePath) !== undefined;
    }

    locate(filePath: string): Window | undefined {
        return this._windows.filter(win => {
            return win.filePath() === filePath;
        })[0];
    }

    activate(filePath: string): boolean {
        const window = this.locate(filePath);
        if (window) {
            window.activate();
            return true;
        }
        return false;
    }
}

export const globalApp = new App();

