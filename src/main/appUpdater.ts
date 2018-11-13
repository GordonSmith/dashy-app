import { dialog } from "electron";
import { autoUpdater } from "electron-updater";

let updater;

autoUpdater.autoDownload = true;
autoUpdater.setFeedURL({
    provider: "github",
    owner: "GordonSmith",
    repo: "dashy-app"
});

autoUpdater.on("error", (error) => {
    dialog.showErrorBox("Auto Update Error: ", error == null ? "unknown" : (error.stack || error).toString());
});

autoUpdater.on("update-available", () => {
    dialog.showMessageBox({
        type: "info",
        message: "Found updates, do you want update now?",
        buttons: ["Sure", "No"]
    }, (buttonIndex) => {
        if (buttonIndex === 0) {
            autoUpdater.downloadUpdate();
        } else {
            updater.enabled = true;
            updater = null;
        }
    });
});

autoUpdater.on("update-not-available", () => {
    dialog.showMessageBox({
        type: "info",
        message: "There are currently no updates available."
    });
    updater.enabled = true;
    updater = null;
});

autoUpdater.on("update-downloaded", () => {
    dialog.showMessageBox({
        message: "Updates downloaded, application will be quit for update..."
    }, () => {
        setImmediate(() => autoUpdater.quitAndInstall());
    });
});

// export this to MenuItem click callback
export function checkForUpdates(menuItem) {
    updater = menuItem;
    updater.enabled = false;
    autoUpdater.checkForUpdates();
}
