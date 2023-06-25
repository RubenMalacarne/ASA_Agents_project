import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import * as config from "../../config.js";
import { Agents_DataBase } from "../../0_Common_Files/agents_sensing.js";
import { Parcels_DataBase } from "../../0_Common_Files/parcel_sensing.js";
import { City_Map } from "../../0_Common_Files/citymap.js";
import { Naive_agent_Strategy } from "./strategy_naive.mjs";



class Agent{
    /**
     * @type {{id: string; name: string; x: number; y: number; score: number;}}
     */
    my_data={}

    /**
     * 
     * @param {DeliverooApi} client
     */
    constructor(client){
        this.client=client
        this.client.onYou(( {id, name, x, y, score} ) => {
            this.my_data.id = id
            this.my_data.name = name
            this.my_data.x = Math.round(x)
            this.my_data.y = Math.round(y)
            this.my_data.score = score
            this.agentDB.updateLostAgents(this.my_data)
            this.parcelDB.updateLostParcels(this.my_data)
        });
        this.agentDB=new Agents_DataBase(this.client);
        this.parcelDB=new Parcels_DataBase(this.client);
        this.city=new City_Map(this.client);
        this.strategy=new Naive_agent_Strategy(this);
    }

    /**
     * @returns {{id: string; x: number; y: number; carriedBy: string; reward: number;} | null} 
     */
    findClosestParcel(){
        return this.city.findClosestParcel(this.my_data,this.agentDB.getPositionsOfAllAgents(),this.parcelDB.getAllParcels())
    }

    /**
     * @returns {{x: number; y: number;} | null} 
     */
    findClosestDeliverySpot(){
        return this.city.findClosestDeliverySpot(this.my_data,this.agentDB.getPositionsOfAllAgents());
    }

    start(){
        console.log(this)
        this.strategy.load_exploration_spots();
        this.strategy.apply_behaviour();
    }
}

export { Agent }