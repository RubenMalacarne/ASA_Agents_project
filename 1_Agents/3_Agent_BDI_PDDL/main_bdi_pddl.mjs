import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import * as config from "../../config.js";
import * as constants from "../../0_Common_Files/constants.js"
import { Agent } from "./agent_bdi_pddl.js";

// load token
let token=process.env.BDI_PDDL_AGENT_TOKEN

// create client
const client=new DeliverooApi(
    config.host,
    token
);

// create agent
let agent=new Agent(client)

// wait for loading and then start the agent
setTimeout(()=>{

    agent.city.viewmatrix_map();
    agent.start()

},constants.TIME_TO_LOAD);

    
    // console.log("color check")
    // console.log('\x1b[33m 33   \x1b[0m');
    // console.log('\x1b[34m 34   \x1b[0m');
    // console.log('\x1b[35m 35   \x1b[0m');
    // console.log('\x1b[36m 36   \x1b[0m');