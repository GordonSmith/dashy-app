import * as moduleAlias from "module-alias";

const LOCAL_HPCC = false;
if (LOCAL_HPCC) {
    moduleAlias.addAlias("@hpcc-js", __dirname + "../../../hpcc-js/packages");
}

import { about } from "./renderer/about";
import { dashy } from "./renderer/dashy";

if (window.location.href.indexOf("about.html") >= 0) {
    about();
} else {
    dashy();
}
