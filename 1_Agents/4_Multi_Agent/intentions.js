import { manhattan_distance } from "../../0_Common_Files/metrics.js";
import { Beliefs } from "./beliefs.js";
import { Desires } from "./desires.js";
import * as constants from "../../0_Common_Files/constants.js"

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
        this.utility=0
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
     * This function builds an Intentions object
     */
    constructor(){
        this.intentions=[]
    }

    /**
     * This function takes the desires of the agent and filters them to decide the
     * best intention(s) to achieve
     * @param {Desires} desires
     * @param {Beliefs} beliefs
     */
    filter(beliefs,desires){
        this.intentions=[]
        let me=beliefs.my_data
        let reachability_map=beliefs.city.getAllReachable(me,me,beliefs.getPositionOfEnemyAgents())
        desires.possibilities=desires.possibilities.filter((v)=>{
            return reachability_map[v.location.x][v.location.y]>=0
        })
        if(desires.possibilities.length == 0){
            // If I cannot do anything I wait 2 seconds and retry later
            this.intentions.push(new Intention(me.x,me.y,"wait",[2000]))
            return;
        }
        let bag=beliefs.getParcelBeliefs().getMyBagFromId(me.id);
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
        let utilities = intentions_from_desires.map(intention=>{return this.utility(intention,bag_score,bag.length,beliefs);})
        // take intention with the highest score
        for(let i=0;i<intentions_from_desires.length;i++){
            intentions_from_desires[i].utility=utilities[i]
            this.intentions.push(intentions_from_desires[i])
        }
        this.intentions.sort((a,b)=>{
            return b.utility-a.utility
        })
        //console.log(this.intentions)
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
     * @param {Beliefs} beliefs
     * @returns {boolean}
     */
    has_succeeded(beliefs){
        let current=this.getFront()
        if(current===null){
            return true
        }
        //console.log(current)
        let me=beliefs.my_data
        if(manhattan_distance(me,current.location)>0) // i am not in the desired position yet
            return false
        if(current.action == "go to")
            return true
        if(current.action == "pick up"){
            let parcel_id=current.args[0]
            let parcel_data=beliefs.getParcelBeliefs().getParcelFromId(parcel_id)
            if(!parcel_data)
                return false;
            if(parcel_data.carriedBy==me.id){
                return true
            }
        }
        if(current.action == "put down"){
            let my_bag=beliefs.getParcelBeliefs().getMyBagFromId(me.id)
            if(my_bag.length==0)
                return true
        }
        return false
    }

    /**
     * This function checks if the current intention is for some reason not
     * achievable and returns a boolean describing the result
     * @param {Beliefs} beliefs
     * @returns {boolean}
     */
    is_impossible(beliefs){
        let current=this.getFront()
        if(current === null)
            return false;
        let me = beliefs.my_data
        if(manhattan_distance(me,current.location)==0){
            if(current.action=="pick up"){
                let parcel=beliefs.getParcelBeliefs().getParcelFromId(current.args[0])
                if(manhattan_distance(me,parcel)==0 && !parcel.carriedBy)
                    return false;
                else
                    return true;
            }
            if(current.action=="put down"){
                let delivery_zones=beliefs.city.getDeliverySpots()
                for(let zone of delivery_zones){
                    if(manhattan_distance(me,zone)==0)
                        return false;
                }
                return true;
            }
            return false;
        }else{
            let path = beliefs.city.getPath(me,current.location,me,beliefs.getPositionOfEnemyAgents())
            if (path.length==0){
                return true;
            }
            if(current.action=="pick up"){
                let parcel=beliefs.getParcelBeliefs().getParcelFromId(current.args[0])
                if(! parcel)
                    return true;
                if(!parcel.carriedBy)
                    return false;
                else
                    return true;
            }
            if(current.action=="put down"){
                let delivery_zones=beliefs.city.getDeliverySpots()
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
     * 
     * !!! RECONSIDER ONLY IF IN SINGLE PLAN, NEVER IN MULTIPLAN STATUS !!!
     * @param {Beliefs} beliefs
     * @returns {boolean}
     */
    reconsider(beliefs){
        let current=this.getFront()
        if(current === null)
            return true
        let me=beliefs.my_data
        let reachability_map=beliefs.city.getAllReachable(me,me,beliefs.getPositionOfEnemyAgents())
        let bag=beliefs.getParcelBeliefs().getMyBagFromId(me.id)
        let bag_score=0
        for(let p of bag){bag_score+=p.reward;}
        let new_parcels=beliefs.getParcelBeliefs().getFreeParcels()
        /**  @type {[Intention]} */
        let new_intentions=[]
        for(let p of new_parcels){
            if(reachability_map[p.x][p.y]>=0){
                new_intentions.push(new Intention(p.x,p.y,"pick up",[p.id]))
            }
        }
        if(bag_score>0){
            for(let zone of beliefs.city.getDeliverySpots()){
                if(reachability_map[zone.x][zone.y]>=0){
                    new_intentions.push(new Intention(zone.x,zone.y,"put down",[]))
                }
            }
        }
        let old_best=this.utility(current,bag_score,bag.length,beliefs)
        let new_best=Math.max.apply(new_intentions.map(intention=>{
            this.utility(intention,bag_score,bag.length,beliefs)
        }))
        // If I find an Intention with better utility then the current one, I should reconsider my intentions
        return old_best < new_best
    }

    /**
     * Takes as input a possible intention and associates it with a score
     * which is a number that represents how much value the intention can give
     * @param {Intention} option
     * @param {number} bag_score
     * @param {number} bag_size
     * @param {Beliefs} beliefs
     * @returns {number}
     */
    utility(option,bag_score, bag_size, beliefs){
        let me=beliefs.my_data
        if(option.action == "go to"){
            return Math.ceil(Math.random() * 10);
        }
        if(option.action == "pick up"){
            let delivery_zones=beliefs.city.getDeliverySpots();
            let parcel = beliefs.getParcelBeliefs().getParcelFromId(option.args[0])
            if(parcel===null)
                return -1;
            let parcel_distance = beliefs.city.getPath(me,option.location,me,beliefs.getPositionOfEnemyAgents()).length
            let delivery_zone_score=delivery_zones.map(zone=>{
                let delivery_distance = beliefs.city.getPathIgnoringAgents(parcel,zone).length
                let travel_distance = delivery_distance + parcel_distance
                let actual_reward = parcel.reward - Math.floor(travel_distance * constants.PARCEL_DECAY_RATE)
                return 10 * (actual_reward + Math.max(bag_score - (bag_size * Math.floor(travel_distance * constants.PARCEL_DECAY_RATE)),0))
            })
            let best=delivery_zone_score[0]
            for(let val of delivery_zone_score){
                if(val>best)
                    best=val
            }
            return best
        }
        if(option.action == "put down"){
            let agents_positions=beliefs.getPositionOfEnemyAgents()
            let delivery_distance = beliefs.city.getPath(me,option.location,me,agents_positions).length
            if(constants.PARCEL_DECAY_RATE==0)
                return 20 * (bag_score - bag_size )
            return 20 * (bag_score - (bag_size * Math.floor(delivery_distance * constants.PARCEL_DECAY_RATE)))
        }
        return 0;
    }
}

export{Intention,Intentions}