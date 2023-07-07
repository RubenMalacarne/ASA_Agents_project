import { manhattan_distance } from "../../0_Common_Files/metrics.js";
import { Beliefs } from "./beliefs.js";
import { Desires } from "./desires.js";

class Intention{
    /**
     * This function builds a single Intention object to be queued in the intentions queue
     * The actions can be from: ["pick up", "go to", "put down", "wait"]
     * @param {number} x 
     * @param {number} y 
     * @param {string} action 
     * @param {[string]} args
     */
    constructor(x,y,action,args){
        this.location={x:x,y:y}
        this.args=args
        if(action=="pick up" || action=="go to" || action=="put down" || action=="wait")
            this.action=action
    }
}

class Intentions{
    /**
     * A list of the intentions to achieve, sorted in order of
     * achievement
     * @type {[Intention]}
     */
    intentions=[]
    /**
    * A list of the intentions to achieve, sorted in order of
    * achievement
    * @type {[Intention]}
    */
    old_intentions=[]
    /**
     * @type {Beliefs}
     */
    beliefs

    /**
     * This function builds an Intentions object
     * from a Beliefs object
     * @param {Beliefs} beliefs 
     */
    constructor(beliefs){
        this.beliefs=beliefs
        this.intentions=[]
        this.old_intentions = []
        
    }

    /**
     * This function takes the desires of the agent and filters them to decide the
     * best intention(s) to achieve
     * @param {Desires} desires
     */
    filter(desires){
        this.intentions=[]
        let me=this.beliefs.my_data
        let reachability_map=this.beliefs.city.getAllReachable(me,me,this.beliefs.getAgentBeliefs().getPositionsOfAllAgents())
        desires.possibilities=desires.possibilities.filter((v)=>{
            return reachability_map[v.location.x][v.location.y]>=0
        })
        if(desires.possibilities.length == 0){
            // If I cannot do anything I wait 2 seconds and retry later
            this.intentions.push(new Intention(me.x,me.y,"wait",[2000]))
            return;
        }
        let bag=this.beliefs.getParcelBeliefs().getMyBag(me);
        let bag_score=0
        for(let parcel of bag){
            bag_score += parcel.reward
        }
        // map every desire into a possible Intention
        let intentions_from_desires=desires.possibilities.map(desire=>{
            if(desire.action == "pick up"){
                return new Intention(desire.location.x,desire.location.y,"pick up",[desire.parcel.id])
            }
            if(desire.action=="put down"){
                return new Intention(desire.location.x,desire.location.y,"put down",[])
            }
            if(desire.action=="go to"){
                return new Intention(desire.location.x,desire.location.y,"go to",[])
            }
            return new Intention(me.x,me.y,"go to",[])
        })
        // compute the score of each intention
        let utilities = intentions_from_desires.map(intention=>{return this.utility(intention,bag_score,bag.length);})

        let IntentionUtilityMap = intentions_from_desires.map((intention, index) => {
            return { intention: intention, utility: utilities[index] };
          });
        
        IntentionUtilityMap.sort((a, b) => b.utility - a.utility)
        console.log("--------------------------------------filtering:")    
        //if i go in the exploration phase    
        if (IntentionUtilityMap[0].intention.action == "go to"){
        // console.log(utilities)
        // console.log(desires.possibilities)
        for (let i of IntentionUtilityMap){
            if (this.hasVisitedPosition(i.intention)) {
                i.utility = 0
                }
        }

        IntentionUtilityMap.sort((a, b) => b.utility - a.utility)
        console.log ("***********************************")
        for (let i of IntentionUtilityMap){
            console.log (i.intention)
            console.log (i.utility)
        }
        console.log ("***********************************")
        
        if (! this.hasVisitedPosition(IntentionUtilityMap[0].intention)){
            console.log("Questa è una nuova posizione.");
            if (this.old_intentions.length >= (this.beliefs.exploration_spots.size-1)){
            this.old_intentions.push(IntentionUtilityMap[0].intention)
            this.old_intentions.shift()
            }
            else {this.old_intentions.push(IntentionUtilityMap[0].intention)
            console.log("Hai già visitato questa posizione.")}


        }
        console.log("\ncurrent intention")
        console.log(IntentionUtilityMap[0].intention)
        console.log("\nold intention")
        console.log(this.old_intentions)        
        this.intentions.push(IntentionUtilityMap[0].intention)
        console.log("LUNGHEZZA OLD INTENTION_" + this.old_intentions.length)
        }

        else {
            //if i go in the pick-up or put_down
            this.intentions.push(IntentionUtilityMap[0].intention)            
        }
    }
    
    
    /**
     * @param {Intention} current_int
     */
    hasVisitedPosition(current_int){
       
        for (let i of this.old_intentions){
            if (current_int.location.x === i.location.x && current_int.location.y === i.location.y )  return true               
        }
            return false
    }
       /**
     * Takes as input a possible intention and associates it with a score
     * which is a number that represents how much value the intention can give
     * @param {Intention} option
     * @param {number} bag_score
     * @param {number} bag_size
     * @returns {number}
     */
       utility(option,bag_score, bag_size){
        let me=this.beliefs.my_data
        if(option.action == "go to"){
            return manhattan_distance(me,option.location)
        }
        if(option.action == "pick up"){
            let delivery_zones=this.beliefs.city.getDeliverySpots();
            let parcel = this.beliefs.getParcelBeliefs().getParcelFromId(option.args[0])
            if(parcel===null)
                return -1;
            let parcel_distance = this.beliefs.city.getPath(me,option.location,me,this.beliefs.getAgentBeliefs().getPositionsOfAllAgents()).length
            return Math.max.apply(null,delivery_zones.map(zone=>{
                let delivery_distance = this.beliefs.city.getPathIgnoringAgents(parcel,zone).length
                let travel_distance = delivery_distance + parcel_distance
                let actual_reward = parcel.reward - delivery_distance 
                return 100 * (actual_reward + Math.max(bag_score - (bag_size * travel_distance),0))
            }))
        }
        if(option.action == "put down"){
            let agents_positions=this.beliefs.getAgentBeliefs().getPositionsOfAllAgents()
            let delivery_distance = this.beliefs.city.getPath(me,option.location,me,agents_positions).length
            return 100 * (bag_score - (bag_size * delivery_distance))
        }
        return 0;
    }


    /**
     * This function returns the first intention from the intentions array
     * without editing the array. If no intention is currently in the array, then this
     * function returns null.
     * @returns {Intention | null}
     */
    getFront(){
        if(this.intentions.length>0)
            return this.intentions[0]
        else    
            return null
    }

    /**
     * This function removes the first intention from the intentions array
     * and returns it. If no intention is currently in the array, then this
     * function returns null.
     * @returns {Intention | null}
     */
    popFront(){
        if(this.intentions.length>0)
            return this.intentions.shift()
        else    
            return null
    }

    /**
     * This function checks if the current intention has finally succeded (example: the
     * agent has picked up the intended parcel) returning a boolean describing the result
     * @returns {boolean}
     */
    has_succeeded(){
        let current=this.getFront()
        if(current===null){
            return true
        }
        let me=this.beliefs.my_data
        if(manhattan_distance(me,current.location)>0) // i am not in the desired position yet
            return false
        if(current.action == "go to")
            return true
        if(current.action == "pick up"){
            let parcel_id=current.args[0]
            let parcel_data=this.beliefs.getParcelBeliefs().getParcelFromId(parcel_id)
            if(!parcel_data)
                return false;
            if(parcel_data.carriedBy==me.id){
                return true
            }
        }
        if(current.action == "put down"){
            let my_bag=this.beliefs.getParcelBeliefs().getMyBag(me)
            if(my_bag.length==0)
                return true
        }
        return false
    }

    /**
     * This function checks if the current intention is for some reason not
     * achievable and returns a boolean describing the result
     * @returns {boolean}
     */
    is_impossible(){
        let current=this.getFront()
        if(current === null)
            return false;
        let me = this.beliefs.my_data
        if(manhattan_distance(me,current.location)==0){
            if(current.action=="pick up"){
                let parcel=this.beliefs.getParcelBeliefs().getParcelFromId(current.args[0])
                if(manhattan_distance(me,parcel)==0 && !parcel.carriedBy)
                    return false;
                else
                    return true;
            }
            if(current.action=="put down"){
                let delivery_zones=this.beliefs.city.getDeliverySpots()
                for(let zone of delivery_zones){
                    if(manhattan_distance(me,zone)==0)
                        return false;
                }
                return true;
            }
            return false;
        }else{
            let path = this.beliefs.city.getPath(me,current.location,me,this.beliefs.getAgentBeliefs().getPositionsOfAllAgents())
            if (path.length==0){
                return true;
            }
            // if(current.action=="pick up"){
            //     let parcel=this.beliefs.getParcelBeliefs().getParcelFromId(current.args[0])
            //     if(!parcel.carriedBy)
            //         return false;
            //     else
            //         return true;
            // }
            if(current.action=="put down"){
                let delivery_zones=this.beliefs.city.getDeliverySpots()
                for(let zone of delivery_zones){
                    if(manhattan_distance(current.location,zone)==0)
                        return false;
                }
                return true;
            }
            return false;
        }
    }

    /**
     * This function checks if the current intention has become not the best intention anymore and
     * should be changed for some different intention without modifying the current intention
     * @returns {boolean}
     */
    reconsider(){
        let current=this.getFront()
        if(current === null)
            return true
        let me=this.beliefs.my_data
        let reachability_map=this.beliefs.city.getAllReachable(me,me,this.beliefs.getAgentBeliefs().getPositionsOfAllAgents())
        let bag=this.beliefs.getParcelBeliefs().getMyBag(me)
        let bag_score=0
        for(let p of bag){bag_score+=p.reward;}
        let new_parcels=this.beliefs.getParcelBeliefs().getFreeParcels()
        /**  @type {[Intention]} */
        let new_intentions=[]
        for(let p of new_parcels){
            if(reachability_map[p.x][p.y]>=0){
                new_intentions.push(new Intention(p.x,p.y,"pick up",[p.id]))
            }
        }
        if(bag_score>0){
            for(let zone of this.beliefs.city.getDeliverySpots()){
                if(reachability_map[zone.x][zone.y]>=0){
                    new_intentions.push(new Intention(zone.x,zone.y,"put down",[]))
                }
            }
        }
        let old_best=this.utility(current,bag_score,bag.length)
        let new_best=Math.max.apply(new_intentions.map(intention=>{
            this.utility(intention,bag_score,bag.length)
        }))
        // If I find an Intention with better utility then the current one, I should reconsider my intentions
        return old_best < new_best
    }

 
}

export{Intention,Intentions}