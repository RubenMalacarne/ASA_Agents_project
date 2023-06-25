
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { Agent } from "./agent_naive.js"
import * as config from "./../../config.js";
import * as constants from "../../0_Common_Files/constants.js"

const TIME_TO_LOAD=constants.TIME_TO_LOAD;
const token = process.env.NAIVE_AGENT_TOKEN

const client = new DeliverooApi(
    config.host,
    token
)

let agent = new Agent(client)

setTimeout(()=>{
    main_process()
    },TIME_TO_LOAD)// wait 100 ms before starting to work

function main_process(){
    console.log("-------------START AGENT_LET'S GO!-------------")
    
    //complete_map(map_layout)
    agent.strategy.load_exploration_spots();
    agent.strategy.apply_behaviour();
    
    

}