import { City_Map } from "../../0_Common_Files/citymap.js"
import { isObjEmpty, manhattan_distance } from "../../0_Common_Files/metrics.js"
import { Synchronous_Agents_DataBase } from "./synchAgentDB.js"
import { Synchronous_Parcels_DataBase } from "./synchParcelDB.js"
import { Friend_Beliefs } from "./FriendBeliefs.js"
import { Intentions } from "./intentions.js"
import { AGENTS_VIEW_DISTANCE, PARCEL_VIEW_DISTANCE } from "../../0_Common_Files/constants.js"

const VIEW_DISTANCE = Math.min(PARCEL_VIEW_DISTANCE, AGENTS_VIEW_DISTANCE);

class Beliefs{
    /**
     * @type {City_Map}
     */
    city
    /**
     * @type {Synchronous_Parcels_DataBase}
     */
    parcelDB
    /**
     * @type {Synchronous_Agents_DataBase}
     */
    agentDB
    /**
     * @type {Map<string,{x: number; y:number; last_seen: number;}>}
     */
    exploration_spots
    /**
     * @type {{x: number; y: number; id: string; score: number; name: string;}}
     */
    my_data
    /**
     * @type {Map<string,Friend_Beliefs>}
     */
    friend_beliefs

    /**
     * This function initializes the data structures needed to handle the beliefs
     * @param {City_Map} city
     */
    constructor(city){
        this.city=city
        this.my_data={
            x:0,
            y:0,
            name: "",
            id: "",
            score: 0
        }
        this.agentDB=new Synchronous_Agents_DataBase()
        this.parcelDB=new Synchronous_Parcels_DataBase()
        this.exploration_spots=new Map()
        this.friend_beliefs=new Map()
    }

    /**
     * Sets the "finito" flag for a team mate that sent a "finito"
     * @param {string} friend_id  
     */
    on_finito(friend_id){
        if(!this.friend_beliefs.has(friend_id))
            return;
        let friend=this.friend_beliefs.get(friend_id)
        friend.finito=true;
    }

    /**
     * Resets the friends intentions and "finito" messages
     */
    reset_friends(){
        this.reset_finito()
        this.reset_intentions()
    }

    /**
     * resets all finito for my team
     */
    reset_finito(){
        for(let friend of this.friend_beliefs.values()){
            friend.finito=false;
        }
    }

    /**
     * resets all intentions for my team
     */
    reset_intentions(){
        for(let friend of this.friend_beliefs.values()){
            friend.intentions=null;
        }
    }

    /**
     * Checks if everyone on y team has sent a "finito"
     * @returns {boolean}
     */
    everyone_sent_finito(){
        let team_size=0
        let finito_number=0
        for(let friend of this.friend_beliefs.values()){
            team_size+=1;
            if(friend.finito)
                finito_number+=1;
        }
        if(team_size==0) // I am alone in my team
            return false;
        return team_size==finito_number
    }

    /**
     * Checks if everyone on y team has sent a "finito"
     * @returns {boolean}
     */
    everyone_sent_intentions(){
        let team_size=0
        let intentions_number=0
        for(let friend of this.friend_beliefs.values()){
            team_size+=1;
            if(friend.intentions!==null)
                intentions_number+=1;
        }
        if(team_size==0) // I am alone in my team
            return false;
        return team_size==intentions_number
    }

    /**
     * This function updates my data inside the beliefs
     * @param {{x: number; y: number; id: string; score: number; name: string;}} me
     */
    on_me(me){
        this.my_data.name=me.name
        this.my_data.id=me.id
        this.my_data.x=Math.round(me.x)
        this.my_data.y=Math.round(me.y)
        this.my_data.score=me.score
        // update exploration spots last seen property
        let now = new Date().getTime();
        for(let [id,spot] of this.exploration_spots){
            if(manhattan_distance(spot,this.my_data)<VIEW_DISTANCE){
                spot.last_seen = now;
            }
        }
    }

    /**
     * This function updates my data inside the beliefs
     * @param {{x: number; y: number; id: string; score: number; name: string;}} data
     */
    on_friend_update(data){
        if(!this.friend_beliefs.has(data.id)){
            let new_friend=new Friend_Beliefs(data.id)
            new_friend.on_update(data)
            this.friend_beliefs.set(data.id,new_friend)
        }else{
            let friend=this.friend_beliefs.get(data.id)
            friend.on_update(data);
            // If a friend explores an exploration spot it is good to update its last seen 
            // since I get the data about my frineds beliefs and so I know what is in the spot
            let now = new Date().getTime();
            for(let [id,spot] of this.exploration_spots){
                if(manhattan_distance(spot,data)<VIEW_DISTANCE){
                    spot.last_seen = now;
                }
            }
        }
    }

    /**
     * This function updates my data inside the beliefs
     * @param {Synchronous_Parcels_DataBase} data
     */
    on_parcel_update(data){
        let db_to_merge=this.parcelDB.deserialize(data)
        this.parcelDB.merge_with(db_to_merge)
    }

    /**
     * This function updates my data inside the beliefs
     * @param {Synchronous_Agents_DataBase} data
     */
    on_agents_update(data){
        let db_to_merge=this.agentDB.deserialize(data)
        this.agentDB.merge_with(this.my_data.id,db_to_merge)
    }

    /**
     * 
     * @param {string} friend_id 
     * @param {Intentions} data 
     * @returns 
     */
    on_intentions(friend_id,data){
        if(!this.friend_beliefs.has(friend_id))
            return;
        let friend=this.friend_beliefs.get(friend_id)
        friend.intentions=data;
    }

    /**
     * Add a new member to the team
     * @param {string} id
     */
    add_friend(id){
        if(!this.friend_beliefs.has(id))
            this.friend_beliefs.set(id,new Friend_Beliefs(id))
    }

    /**
     * This function loads the exploration spots from the map. It must be called when the agent is started,
     * before the agent formulates its desires
     */
    // the agent believes these are the spots it needs to reach in order to explore the map
    load_exploration_spots(){
        let now=new Date().getTime();
        this.exploration_spots.set("center",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() /2),Math.trunc(this.city.getHeight() /2)));
        this.exploration_spots.set("n",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() /2),Math.trunc(this.city.getHeight() *3/4)));
        this.exploration_spots.set("s",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() /2),Math.trunc(this.city.getHeight() /4)));
        this.exploration_spots.set("w",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() /4),Math.trunc(this.city.getHeight() /2)));
        this.exploration_spots.set("e",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() *3/4),Math.trunc(this.city.getHeight() /2)));
        this.exploration_spots.set("ne",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() *3/4),Math.trunc(this.city.getHeight() *3/4)));
        this.exploration_spots.set("se",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() /4),Math.trunc(this.city.getHeight() *3/4)));
        this.exploration_spots.set("nw",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() *3/4),Math.trunc(this.city.getHeight() /4)));
        this.exploration_spots.set("sw",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() /4),Math.trunc(this.city.getHeight() /4)));
        this.exploration_spots.set("00",this.city.findClosestSpotFromCenter(0,0));
        this.exploration_spots.set("10",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() /4),0));
        this.exploration_spots.set("20",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() /2),0));
        this.exploration_spots.set("30",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() *3/4),0));
        this.exploration_spots.set("40",this.city.findClosestSpotFromCenter(this.city.getWidth()-1,0));
        this.exploration_spots.set("04",this.city.findClosestSpotFromCenter(0,this.city.getHeight()-1));
        this.exploration_spots.set("14",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() /4),this.city.getHeight()-1));
        this.exploration_spots.set("24",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() /2),this.city.getHeight()-1));
        this.exploration_spots.set("34",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() *3/4),this.city.getHeight()-1));
        this.exploration_spots.set("44",this.city.findClosestSpotFromCenter(this.city.getWidth()-1,this.city.getHeight()-1));
        this.exploration_spots.set("14",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() /4),this.city.getHeight()-1));
        this.exploration_spots.set("24",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() /2),this.city.getHeight()-1));
        this.exploration_spots.set("34",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() *3/4),this.city.getHeight()-1));
        this.exploration_spots.set("10",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() /4),0));
        this.exploration_spots.set("20",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() /2),0));
        this.exploration_spots.set("30",this.city.findClosestSpotFromCenter(Math.trunc(this.city.getWidth() *3/4),0));
        for(let [id,spot] of this.exploration_spots)
            spot.last_seen = now;
    }

    /**
     * This function returns a reference to the beliefs about other agents
     * @returns {Synchronous_Agents_DataBase}
     */
    getAgentBeliefs(){
        return this.agentDB
    }

    /**
     * This function returns a reference to the beliefs about parcels
     * @returns {Synchronous_Parcels_DataBase}}
     */
    getParcelBeliefs(){
        return this.parcelDB
    }

    /**
     * This function returns a reference to the beliefs about  friends
     * @returns {Map<string,Friend_Beliefs>}
     */
     getFriendBeliefs(){
        return this.friend_beliefs
    }

    /**
     * 
     * @returns {[{x: number; y:number; is_lost: boolean;}]}
     */
    getPositionOfAllAgents(){
        return this.agentDB.getPositionsOfAllAgents()
    }

    /**
     * Compute a map associating each id of a friend its intentions
     * @returns {Map<string,Intentions>}
     */
    getIntentionsMap(){
        let res=new Map()
        for(let [id,friend] of this.friend_beliefs){
            let  friend_intention=friend.intentions;
            res.set(id,friend_intention)
        }
        return res;
    }

    /**
     * 
     * @returns {[{x: number; y:number; is_lost: boolean;}]}
     */
    getPositionOfEnemyAgents(){
        let friends=[]
        for(let f of this.friend_beliefs.keys())
            friends.push(f)
        return this.agentDB.getPositionsOfEnemyAgents(friends)
    }
}
export{Beliefs}