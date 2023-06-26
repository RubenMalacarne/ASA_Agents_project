import * as constants from "../../0_Common_Files/constants.js"
import { manhattan_distance } from "../../0_Common_Files/metrics.js";

class Synchronous_Agents_DataBase{
    /**
     * @type {Map<string, {id: string; name: string; x: number; y: number; score: number; is_lost:bool; last_seen: number;}>}
     */
    database = new Map();
    /**
     * @type {[{id: string; name: string; x: number; y: number; score: number;}]}
     */
    last_update = []

    /**
     * build a new Synchronous Agent Sensing
    */
    constructor(){
        this.database=new Map()
    }

    /**
    * @param {[{id: string; name: string; x: number; y: number; score: number;}]} agents
    */
    updateAgentsData(agents){
        this.last_update = agents;
        let update_time=new Date().getTime()
        for(const agent of agents){
            agent.x=Math.round(agent.x)
            agent.y=Math.round(agent.y)
            if ( ! this.database.has( agent.id) ) { // new agent discovered
                agent.is_lost=false;
                agent.last_seen=new Date();
                this.database.set( agent.id, agent )
            } else { // old agent to update
                let knowledge = this.database.get(agent.id)
                knowledge.x=agent.x;
                knowledge.y=agent.y;
                knowledge.is_lost=false;
                knowledge.score=agent.score;
                knowledge.last_seen=update_time
            }
        }
    }

    /**
    * @param {{x: number; y: number;}} my_data
    */
    updateLostAgents(my_data){
        let update_ids=this.last_update.map( a=>a.id );
        for(let knowledge of this.database.values()){
            if( ! update_ids.includes(knowledge.id) && !knowledge.is_lost){
                if ( manhattan_distance(my_data, {x:knowledge.x,y:knowledge.y}) <= constants.AGENTS_VIEW_DISTANCE){ // condition to forget a not lost agent
                    knowledge.is_lost=true;
                }
            }
        }
    }

    /**
     * @param {string} my_id
     * @param {Synchronous_Agents_DataBase} agent_DB
     */
    merge_with(my_id,agent_DB){
        let now=new Date().getTime()
        for(let [id,agent] of agent_DB.database){
            if ( ! this.database.has( id) ) { // new agent discovered
                this.database.set( id, agent )
            } else { // old agent to update
                let knowledge = this.database.get(id)
                if(knowledge.last_seen < agent.last_seen){ // if update is more recent than our knowledge, update knowledge
                    knowledge.x=agent.x;
                    knowledge.y=agent.y;
                    knowledge.is_lost=agent.is_lost;
                    knowledge.last_seen=agent.last_seen;
                    knowledge.score=agent.score;
                }
            }
        }
        if(this.database.has(my_id))
            this.database.delete(my_id) 
    }



    /**
     * @param {number} id
     * @returns {{x: number; y:number; is_lost: boolean;} | null}
     */
    getPositionOfAgent(id){
        if(! this.database.has(id)){
            return null;
        }
        const knowledge = this.database.get(id)
        if(knowledge.is_lost){
            return {x:knowledge.x,y:knowledge.y,is_lost:true}
        }else{
            return {x:knowledge.x,y:knowledge.y,is_lost:false} 
        }
    }

    /**
     * returns the position of all agents (lost or not)
     * @returns {[{x: number; y:number; is_lost: boolean;}]}
     */
    getPositionsOfAllAgents(){
        let acc=[]
        for(const [id,know] of this.database){
            acc.push({id:id,x:know.x,y:know.y})
        }
        return acc;
    }

    /**
     * returns the position of all enemy agents (lost or not)
     * @param {[string]} friends
     * @returns {[{x: number; y:number; is_lost: boolean;}]}
     */
    getPositionsOfEnemyAgents(friends){
        let acc=[]
        for(const [id,know] of this.database){
            acc.push({id:id,x:know.x,y:know.y})
        }
        acc = acc.filter(agent=>!(friends.includes(agent.id)))
        return acc;
    }

    /**
     * returns the positions of known agents
     * @returns {[{x: number; y:number; is_lost: boolean;}]}
     */
    getPositionsOfKnownAgents(){
        let acc=[]
        for(const [id,know] of this.database){
            if(!know.is_lost){
                acc.push({id:id,x:know.x,y:know.y})
            } 
        }
        return acc;
    }

    /**
     * @returns {[{id: string; name: string; x: number; y: number; score: number;}]}
     */
    getLastUpdate(){
        return this.last_update
    }


    /**
     * @returns {[{key:string;value:{id: string; name: string; x: number; y: number; score: number; is_lost:bool; last_seen: number;}}]}
     */
    serialize(){
        let object=[]
        for(let [id,entry] of this.database){
            object.push({
                key: id,
                value: entry
            })
        }
        return object;
    }

    /**
     * @param {[{key:string;value:{id: string; name: string; x: number; y: number; score: number; is_lost:bool; last_seen: number;}}]} data
     * @returns {Synchronous_Agents_DataBase}
     */
    deserialize(data){
        let db=new Synchronous_Agents_DataBase()
        for(let object of data){
            db.database.set(object.key,object.value)
        }
        return db;
    }

}

export {Synchronous_Agents_DataBase}