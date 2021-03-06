import { app, Menu, MenuItemConstructorOptions } from "electron";
import * as fs from "fs";
import * as path from "path";
import { globalApp } from "../main";
import { checkForUpdates } from "./appUpdater";
import { ensureDir, getPath, isFile, notOsx } from "./platform";
import { Window } from "./window";

const FILE_NAME = "recently-used-documents.json";

export class WindowMenu {

    private _owner: Window;
    private _eMenu: Menu;

    initMacDock = false;
    MAX_RECENTLY_USED_DOCUMENTS = 12;
    isOsxOrWindows = /darwin|win32/.test(process.platform);
    isOsx = process.platform === "darwin";
    RECENTS_PATH = path.join(getPath("userData"), FILE_NAME);

    constructor(owner: Window) {
        this._owner = owner;

        this.updateAppMenu();
        // this._eMenu.getMenuItemById("fileSave").enabled = false;
    }

    updateEnabled(enabled: { [key: string]: boolean }) {
        for (const key in enabled) {
            const item = this._eMenu.getMenuItemById(key);
            if (item) {
                item.enabled = enabled[key];
            }
        }
    }

    osx(): MenuItemConstructorOptions {
        const context = this;
        return {
            label: "Dashy App",
            submenu: [{
                label: "About Dashy App",
                click(menuItem, browserWindow) {
                    context._owner.openModalUrl("about.html");
                }
            }, {
                label: "Check for Updates...",
                enabled: true,
                click(item, focusedWindow) {
                    checkForUpdates(item);
                }
            }, {
                label: "Preferences",
                accelerator: "Cmd+,",
                visible: false,
                click(menuItem, browserWindow) {
                }
            }, {
                type: "separator"
            }, {
                label: "Services",
                role: "services",
                submenu: []
            }, {
                type: "separator"
            }, {
                label: "Hide Dashy App",
                accelerator: "Command+H",
                role: "hide"
            }, {
                label: "Hide Others",
                accelerator: "Command+Alt+H",
                role: "hideothers"
            }, {
                label: "Show All",
                role: "unhide"
            }, {
                type: "separator"
            }, {
                label: "Quit Dashy App",
                accelerator: "Command+Q",
                click: app.quit
            }]
        };
    }

    file(recentlyUsedFiles): MenuItemConstructorOptions {
        const context = this;
        const retVal: MenuItemConstructorOptions = {
            label: "File",
            submenu: [
                {
                    label: "New Window",
                    accelerator: "CmdOrCtrl+Shift+N",
                    click(menuItem, browserWindow) {
                        globalApp.createWindow();
                    }
                }, {
                    type: "separator"
                }, {
                    label: "Clear",
                    click(menuItem, browserWindow) {
                        context._owner.fileClear();
                    }
                }, {
                    label: "Open File",
                    accelerator: "CmdOrCtrl+O",
                    click(menuItem, browserWindow) {
                        context._owner.fileOpen();
                    }
                }, {
                    type: "separator"
                }, {
                    label: "Import Data",
                    click(menuItem, browserWindow) {
                        context._owner.dataImport();
                    }
                }, {
                    type: "separator"
                }, {
                    label: "Export JavaScript",
                    click(menuItem, browserWindow) {
                        // context._owner.fileOpen();
                    }
                }, {
                    type: "separator"
                }, {
                    id: "fileSave",
                    label: "Save",
                    accelerator: "CmdOrCtrl+S",
                    click(menuItem, browserWindow) {
                        context._owner.fileSave();
                    }
                }, {
                    id: "fileSaveAs",
                    label: "Save As...",
                    accelerator: "Shift+CmdOrCtrl+S",
                    click(menuItem, browserWindow) {
                        context._owner.fileSaveAs();
                    }
                }, {
                    type: "separator"
                }, {
                    label: "Exit",
                    click(menuItem, browserWindow) {
                        browserWindow ? browserWindow.close() : app.quit();
                    }
                }
            ]
        };
        if (notOsx) {
            const recentlyUsedMenu = {
                label: "Open Recent",
                submenu: []
            };

            for (const item of recentlyUsedFiles) {
                recentlyUsedMenu.submenu.push({
                    label: item,
                    click(menuItem, browserWindow) {
                        context._owner.fileOpen(menuItem.label);
                    }
                });
            }

            recentlyUsedMenu.submenu.push({
                type: "separator",
                visible: recentlyUsedFiles.length > 0
            }, {
                    label: "Clear Recently Used",
                    enabled: recentlyUsedFiles.length > 0,
                    click(menuItem, browserWindow) {
                        context.clearRecentlyUsedDocuments();
                    }
                });
            (retVal.submenu as MenuItemConstructorOptions[]).splice(4, 0, recentlyUsedMenu);
        } else {
            (retVal.submenu as MenuItemConstructorOptions[]).splice(4, 0, {
                role: "recentdocuments",
                submenu: [
                    {
                        role: "clearrecentdocuments"
                    }
                ]
            });
        }
        return retVal;
    }

    view(): MenuItemConstructorOptions {
        return {
            label: "View",
            submenu: [
                {
                    label: "Toggle Full Screen",
                    accelerator: (function () {
                        if (process.platform === "darwin") {
                            return "Ctrl+Command+F";
                        } else {
                            return "F11";
                        }
                    })(),
                    click(item, focusedWindow) {
                        if (focusedWindow) {
                            focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
                        }
                    }
                }, {
                    type: "separator"
                }, {
                    label: "Toggle Developer Tools",
                    accelerator: (function () {
                        if (process.platform === "darwin") {
                            return "Alt+Command+I";
                        } else {
                            return "F12";
                        }
                    })(),
                    click(item, focusedWindow) {
                        if (focusedWindow) {
                            focusedWindow.webContents.toggleDevTools();
                        }
                    }
                }
            ]
        };
    }

    help(): MenuItemConstructorOptions {
        const context = this;
        return {
            label: "Help",
            submenu: [
                {
                    label: "Check for Updates...",
                    enabled: true,
                    click(item, focusedWindow) {
                        checkForUpdates(item);
                    }
                }, {
                    type: "separator"
                }, {
                    label: "About",
                    click(item, focusedWindow) {
                        context._owner.openModalUrl("about.html");
                    }
                }
            ]
        };
    }

    all(recentlyUsedFiles): MenuItemConstructorOptions[] {
        return [
            // ...(process.platform === "darwin" ? [this.osx()] : []),
            this.file(recentlyUsedFiles),
            this.view(),
            this.help()
        ];
    }

    //  Recently used files  ---
    addRecentlyUsedDocument(filePath) {
        const { isOsxOrWindows, isOsx, MAX_RECENTLY_USED_DOCUMENTS, RECENTS_PATH } = this;

        if (isOsxOrWindows) app.addRecentDocument(filePath);
        if (isOsx) return;

        const recentDocuments = this.getRecentlyUsedDocuments();
        const index = recentDocuments.indexOf(filePath);
        let needSave = index !== 0;
        if (index > 0) {
            recentDocuments.splice(index, 1);
        }
        if (index !== 0) {
            recentDocuments.unshift(filePath);
        }

        if (recentDocuments.length > MAX_RECENTLY_USED_DOCUMENTS) {
            needSave = true;
            recentDocuments.splice(MAX_RECENTLY_USED_DOCUMENTS, recentDocuments.length - MAX_RECENTLY_USED_DOCUMENTS);
        }

        this.updateAppMenu(recentDocuments);

        if (needSave) {
            ensureDir(getPath("userData"));
            const json = JSON.stringify(recentDocuments, null, 2);
            fs.writeFileSync(RECENTS_PATH, json, "utf-8");
        }
    }

    getRecentlyUsedDocuments() {
        const { RECENTS_PATH, MAX_RECENTLY_USED_DOCUMENTS } = this;
        if (!isFile(RECENTS_PATH)) {
            return [];
        }

        try {
            const recentDocuments = JSON.parse(fs.readFileSync(RECENTS_PATH, "utf-8"))
                .filter(f => f && isFile(f));

            if (recentDocuments.length > MAX_RECENTLY_USED_DOCUMENTS) {
                recentDocuments.splice(MAX_RECENTLY_USED_DOCUMENTS, recentDocuments.length - MAX_RECENTLY_USED_DOCUMENTS);
            }
            return recentDocuments;
        } catch (err) {
            // log(err);
            return [];
        }
    }

    clearRecentlyUsedDocuments() {
        const { isOsxOrWindows, isOsx, RECENTS_PATH } = this;
        if (isOsxOrWindows) app.clearRecentDocuments();
        if (isOsx) return;

        const recentDocuments = [];
        this.updateAppMenu(recentDocuments);
        const json = JSON.stringify(recentDocuments, null, 2);
        ensureDir(getPath("userData"));
        fs.writeFileSync(RECENTS_PATH, json, "utf-8");
    }

    updateAppMenu(recentUsedDocuments?) {
        const { initMacDock } = this;

        if (!recentUsedDocuments) {
            recentUsedDocuments = this.getRecentlyUsedDocuments();
        }

        // "we don't support changing menu object after calling setMenu, the behavior
        // is undefined if user does that." That means we have to recreate the
        // application menu each time.

        this._eMenu = Menu.buildFromTemplate(this.all(recentUsedDocuments));
        Menu.setApplicationMenu(this._eMenu);
        if (!initMacDock && process.platform === "darwin") {
            // app.dock is only for macosx
            // app.dock.setMenu(dockMenu);
        }
        this.initMacDock = true;
    }

    updateLineEndingnMenu(lineEnding) {
        const menus = Menu.getApplicationMenu();
        const crlfMenu = menus.getMenuItemById("crlfLineEndingMenuEntry");
        const lfMenu = menus.getMenuItemById("lfLineEndingMenuEntry");
        if (lineEnding === "crlf") {
            crlfMenu.checked = true;
        } else {
            lfMenu.checked = true;
        }
    }

    updateTextDirectionMenu(textDirection) {
        const menus = Menu.getApplicationMenu();
        const ltrMenu = menus.getMenuItemById("textDirectionLTRMenuEntry");
        const rtlMenu = menus.getMenuItemById("textDirectionRTLMenuEntry");
        if (textDirection === "ltr") {
            ltrMenu.checked = true;
        } else {
            rtlMenu.checked = true;
        }
    }
}
