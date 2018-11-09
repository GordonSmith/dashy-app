import { app } from "electron";
import { Window } from "./main/window";

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
