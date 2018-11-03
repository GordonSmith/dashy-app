import { ipcRenderer } from "electron";
import { load } from "./renderer/dashy";

const app = load("placeholder");
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
