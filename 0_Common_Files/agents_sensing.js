import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import * as constants from "./constants.js"
import { manhattan_distance } from "./metrics.js";

//maximum number of history events recorded for each agent
const SIZE_LIMIT=constants.MEMORY_SIZE_LIMIT;
// maximum numbers of tiles the agent can see from itself
const VIEW_DISTANCE=constants.VIEW_DISTANCE;
// annotation to say that an agent was lost
const LOST = constants.LOST;

class Agents_DataBase{
    /**
     * @type {Map<string, [{id: string; name: string; x: number; y: number; score: number;} | string]>}
     */
    database = new Map();

    /**
     * @type {[{id: string; name: string; x: number; y: number; score: number;}]}
     */
    last_update = []

    /**
    * @param {DeliverooApi} client
    */
    constructor(client){
        this.client = client;
        client.onAgentsSensing((agents)=>{this.updateAgentsData(agents)})
    }

    /**
     * method that update the dataset of the agents
     * @param {[{id: string; name: string; x: number; y: number; score: number;}]} agents
    */
    updateAgentsData(agents){
        this.last_update = agents;
        for(const agent of agents){
            agent.x=Math.round(agent.x)
            agent.y=Math.round(agent.y)
            if ( ! this.database.has( agent.id) ) { // new agent discovered
                this.database.set( agent.id, [agent] )
            } else { // old agent to update
                let knowledge = this.database.get(agent.id)
                knowledge.push(agent)
                if ( knowledge.length > SIZE_LIMIT ){ // keep the size of the beliefs under a given size removing oldest point
                    knowledge.shift() 
                }
            }
        }
    }

    /**
     * method that ??
     * @param {{x: number; y: number;}} my_data
    */
    updateLostAgents(my_data){
        let update_ids=this.last_update.map( a=>a.id );
        for(let [id,knowledge] of this.database){
            const latest = knowledge[ knowledge.length - 1 ]
            if( ! update_ids.includes(id) && latest !== LOST ){
                if ( manhattan_distance(my_data, latest) <= VIEW_DISTANCE ){ // condition to forget a not lost agent
                    knowledge.push(LOST)
                    if ( knowledge.length > SIZE_LIMIT ) // keep the size of the beliefs under a given size removing oldest point
                        knowledge.shift()
                }
            }
        }
    }

    /**
     * method that return the position of an agent and check if it is lost
     * @param {number} id
     * @returns {{x: number; y:number; is_lost: boolean;} | null}
     */
    getPositionOfAgent(id){
        if(! this.database.has(id)){
            return null;
        }
        const knowledge = this.database.get(id)
        const latest = knowledge[knowledge.length-1]
        if(latest===LOST){
            const second_latest = knowledge[knowledge.length-2]
            return {x:second_latest.x,y:second_latest.y,is_lost:true};
        }
        return {x:latest.x,y:latest.y,is_lost:false}
    }

    /**
     * return position of all agent of our dataset
     * @returns {[{x: number; y:number; is_lost: boolean;}]}
     */
    getPositionsOfAllAgents(){
        let acc=[]
        for(const [id,_know] of this.database){
            let latest_position=this.getPositionOfAgent(id);
            if(latest_position!==null){
                acc.push(latest_position)
            } 
        }
        return acc;
    }

    /**
     * return last update
     * @returns {[{id: string; name: string; x: number; y: number; score: number;}]}
     */
    getLastUpdate(){
        return this.last_update
    }
}

export {Agents_DataBase}