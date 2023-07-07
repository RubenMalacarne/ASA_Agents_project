import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import * as config from "../../config.js";
import * as constants from "../../0_Common_Files/constants.js"
import { Agent } from "./multi_agent.js";
import { City_Map } from "../../0_Common_Files/citymap.js";

// load token
let token=process.env.MULTI_AGENT_AGENT_alpha_TOKEN

// create client
const client=new DeliverooApi(
    config.host,
    token
);

// create agent
let agent=new Agent(client)

client.onMap((w,h,t)=>{
    let city=new City_Map(client)
    city.from_map_api(w,h,t)
    agent.city=city;
    agent.beliefs.city=city;
    city.viewmatrix_map()
    agent.start()
})