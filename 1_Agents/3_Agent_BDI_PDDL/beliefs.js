import { DeliverooApi } from "@unitn-asa/deliveroo-js-client"
import { Agents_DataBase } from "../../0_Common_Files/agents_sensing.js"
import { Parcels_DataBase } from "../../0_Common_Files/parcel_sensing.js"
import { City_Map } from "../../0_Common_Files/citymap.js"

class Beliefs{
    /**
     * @type {City_Map}
     */
    city
    /**
     * @type {DeliverooApi}
     */
    client
    /**
     * @type {Parcels_DataBase}
     */
    parcelDB
    /**
     * @type {Agents_DataBase}
     */
    agentDB
    /**
     * @type {Map<string,{x: number; y:number;}>}
     */
    exploration_spots
    /**
     * @type {{x: number; y: number; id: string; score: number; name: string;}}
     */
    my_data

    /**
     * This function initializes the data structures needed to handle the beliefs
     * @param {DeliverooApi} client 
     * @param {City_Map} city
     * @param {{x: number; y: number; id: string; score: number; name: string;}} me
     */
    constructor(client,city,me){
        this.client=client
        this.city=city
        this.my_data=me
        this.agentDB=new Agents_DataBase(client)
        this.parcelDB=new Parcels_DataBase(client)
        this.exploration_spots=new Map()
    }

    /**
     * This function loads the exploration spots from the map. It must be called when the agent is started,
     * before the agent formulates its desires
     */
    // the agent believes these are the spots it needs to reach in order to explore the map
    load_exploration_spots(){
        // this.exploration_spots.set("center",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() /2),Math.trunc(this.city.getHeight() /2)));
        // this.exploration_spots.set("n",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() /2),Math.trunc(this.city.getHeight() *3/4)));
        // this.exploration_spots.set("s",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() /2),Math.trunc(this.city.getHeight() /4)));
        // this.exploration_spots.set("w",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() /4),Math.trunc(this.city.getHeight() /2)));
        // this.exploration_spots.set("e",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() *3/4),Math.trunc(this.city.getHeight() /2)));
        this.exploration_spots.set("ne",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() *3/4),Math.trunc(this.city.getHeight() *3/4)));
        this.exploration_spots.set("se",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() /4),Math.trunc(this.city.getHeight() *3/4)));
        this.exploration_spots.set("nw",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() *3/4),Math.trunc(this.city.getHeight() /4)));
        this.exploration_spots.set("sw",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() /4),Math.trunc(this.city.getHeight() /4)));
    }

    /**
     * This function returns a reference to the beliefs about other agents
     * @returns {Agents_DataBase}
     */
    getAgentBeliefs(){
        return this.agentDB
    }

    /**
     * This function returns a reference to the beliefs about parcels
     * @returns {Parcels_DataBase}
     */
    getParcelBeliefs(){
        return this.parcelDB
    }
}
export{Beliefs}