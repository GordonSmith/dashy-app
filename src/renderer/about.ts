import { event as d3Event, select as d3Select } from "@hpcc-js/common";
import { shell } from "electron";

export function about() {
    // tslint:disable-next-line:no-require-imports
    const pkg = require("../../package.json");

    d3Select("#app-title").text(`Dasy App - ${pkg.version}`);
    d3Select("#app-description").text(pkg.description);

    const homepage = d3Select("#app-homepage");
    homepage.on("click", event => {
        d3Event.preventDefault();
        shell.openExternal(homepage.text());
    });
}
