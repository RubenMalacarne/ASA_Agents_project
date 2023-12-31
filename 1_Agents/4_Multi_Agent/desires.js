import { Graph, astar } from "../../0_Common_Files/astar_new.js"
import { Beliefs } from "./beliefs.js"
import { Intentions } from "./intentions.js"

class Desire{
    /**
     * This function builds a single desire for the possibilities array of the Desires structure
     * @param {number} x 
     * @param {number} y 
     * @param {string} action 
     */
    constructor(x,y,action,parcel){
        this.location={x:x,y:y}
        if(action=="pick up" || action=="go to" || action=="put down")
            this.action=action
        if(this.action=="pick up" || action=="go to")
            this.parcel=parcel
    }
}

class Desires{
    /**
     * the possible desires of the agent
     * @type {[Desire]}
     */
    possibilities=[]

    /**
     * This function builds the desires of the agent from its beliefs and intentions
     * @param {Beliefs} beliefs 
     * @param {Intentions} intentions 
     */
    constructor(beliefs,intentions){
        let parcels_on_ground=beliefs.getParcelBeliefs().getFreeParcels();
        let bag=beliefs.getParcelBeliefs().getMyBagFromId(beliefs.my_data.id);
        //if(bag.length == 0 && parcels_on_ground.length == 0){
            for(let [id,spot] of beliefs.exploration_spots){
                this.possibilities.push(new Desire(spot.x,spot.y,"go to",{id: id}))
            }
        //}
        for(let parcel of parcels_on_ground){
            this.possibilities.push(new Desire(parcel.x,parcel.y,"pick up",parcel))
        }
        if(bag.length > 0){
            for(let zone of beliefs.city.delivery_spots){
                this.possibilities.push(new Desire(zone.x,zone.y,"put down", null))
            }
        }
    }
}
export{Desire,Desires}