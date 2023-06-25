import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import * as config from "../../config.js";
import * as constants from "../../0_Common_Files/constants.js"
import { Agent } from "./agent_bdi.js";

// load token
let token=process.env.BDI_AGENT_TOKEN

// create client
const client=new DeliverooApi(
    config.host,
    token
);

// create agent
let agent=new Agent(client)

// wait for loading and then start the agent
setTimeout(()=>{
    agent.start();
},constants.TIME_TO_LOAD);

