import { app } from "electron";
import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";

export const getPath = directory => {
    return app.getPath(directory);
};

// creates a directory if it doesn't already exist.
export function ensureDir(dirPath) {
    try {
        fse.ensureDirSync(dirPath);
    } catch (e) {
        if (e.code !== "EEXIST") {
            throw e;
        }
    }
}

// returns true if the path is a file with read access.
export function isFile(filepath) {
    try {
        return fs.existsSync(filepath) && fs.lstatSync(filepath).isFile();
    } catch (e) {
        // No permissions
        // log(e);
        return false;
    }
}

export const FILE_NAME = "recently-used-documents.json";
export const MAX_RECENTLY_USED_DOCUMENTS = 12;
export const RECENTS_PATH = path.join(getPath("userData"), FILE_NAME);
export const isOsx = process.platform === "darwin";
export const isWindows = process.platform === "win32";
export const isOsxOrWindows = isOsx || isWindows;
export const notOsx = !isOsx;
