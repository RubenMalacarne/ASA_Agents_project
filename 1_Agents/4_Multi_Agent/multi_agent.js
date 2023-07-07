import { DeliverooApi } from "@unitn-asa/deliveroo-js-client"
import { City_Map } from "../../0_Common_Files/citymap.js";
import { Beliefs } from "./beliefs.js"
import { Desires } from "./desires.js"
import { Intentions } from "./intentions.js"
import { MultiPlan, Planner, PlanObject } from "./plan.js"
import { Communication} from "./communication.js"
import { readFile } from "../../0_Common_Files/files.js"
import * as constants from"../../0_Common_Files/constants.js"
import { Synchronous_Parcels_DataBase } from "./synchParcelDB.js"
import { Synchronous_Agents_DataBase } from "./synchAgentDB.js"

class Agent{
    /**
     * @type {string}
     */
    my_id
    /**
     * The plan that is being executed right now by the agent
     * @type {Planner}
     */
    planner
    /**
     * The client to interact with the API
     * @type {DeliverooApi}
     */
    client
    /**
     * The intentions of the agent
     * @type {Intentions}
     */
    intentions
    /**
     * The beliefs of the agent
     * @type {Beliefs}
     */
    beliefs
    /**
     * The communication of the agent
     * @type {Communication}
     */
    communication
    /**
     * The protocol state of the agent
     * @type {string}
     */
    protocol_status

    /**
     * This function is responsible for initializing all data structures that the agent needs to be
     * able to work properly
     * @param {DeliverooApi} client 
     */
    constructor(client){
        this.client=client
        this.city=new City_Map(this.client)
        this.beliefs=new Beliefs(this.city,this.my_data)
        this.intentions=new Intentions()
        this.communication=new Communication(this)
        this.client.onYou((me)=>{
            this.my_id=me.id
            this.beliefs.on_me(me)
        })
        this.protocol_status="STARTING"
        this.anti_lock=0
    }

    /**
     * This function must be called whenever an agent starts acting in the environment.
     * It starts the agents behaviour
     */
    async start(){
        this.domain = await readFile("./1_Agents/4_Multi_Agent/PDDL_file/domain.pddl");
        this.parallel_domain = await readFile("./1_Agents/4_Multi_Agent/PDDL_file/parallel-domain.pddl");
        if(!this.my_id)
        {
            console.error("Error!!! The agent was unable to find its id.\n"+
            "Check if the connection with the server is working or increase the loading time for the agent");
            process.exit(1); 
        }
        this.communication.received_msg()
        this.planner=new Planner(this.my_id)
        this.beliefs.load_exploration_spots()
        let desires=new Desires(this.beliefs,this.intentions)
        this.intentions.filter(this.beliefs,desires)
        this.broadcast_self()
        setTimeout(()=>{
            this.multicast_finito()
        },1000)
    }

    /**
     * Send my id in broadcast to join the team
     */
    async broadcast_self(){
        await this.communication.broadcast_msg()
    }

    /**
     * send a "finito" to all my teammates
     */
    async multicast_finito(){
        for(let friend of this.beliefs.getFriendBeliefs().keys()){
            await this.communication.send_finito(friend,true)
        }
        if(!this.beliefs.everyone_sent_finito()){
            this.protocol_status="EXEC-SINGLEPLAN"
            let desires=new Desires(this.beliefs,this.intentions,this.domain)
            this.intentions.filter(this.beliefs,desires)
            this.planner.generateSinglePlan(this.intentions,this.beliefs,this.domain).then(()=>{
                this.bdi_control_loop()}
            ).catch(()=>{
                this.start()
            })
        }else{
            // If everyone sent "finito", I am the one that has to compute the multiplan
            /** @type {Map<string,Intentions>} */
            let desires=new Desires(this.beliefs,this.intentions,this.domain)
            this.intentions.filter(this.beliefs,desires)
            this.protocol_status="MASTER-PLANNER"
            this.bdi_control_loop()
        }
    }

    /**
     * BDI control loop implemented as a recursive 
     * function that recurs whenever 
     * some asynchronous event is completed (to avoid blocking of information detection)
     */
    async bdi_control_loop(){
        this.sensing()
        this.share_beliefs()
        this.anti_lock= this.anti_lock+1
        console.log("_________________ STATUS ______________________")
        console.log(this.protocol_status)
        // for(let friend of this.beliefs.getFriendBeliefs().keys())
        //     console.log(friend)
        //console.log(this.beliefs)
        //this.broadcast_self()
        switch(this.protocol_status){
            // executing a plan in multi agent mode
            case "EXEC-MULTIPLAN":{
                this.anti_lock=0
                return this.exec_multiplan();
            }
            // executing a plan in single agent mode
            case "EXEC-SINGLEPLAN":{
                this.anti_lock=0
                return this.exec_singleplan();
            }
            
            case "MASTER-PLANNER":{
                setTimeout(()=>{
                    if (this.anti_lock>=80) this.protocol_status = "EXEC-SINGLEPLAN"
                    this.bdi_control_loop()
                },20)
                return;
            }
            case "READY-MULTIPLAN":{
                this.anti_lock=0;
                let now=new Date().getTime();
                if(now > this.multiplan_execution_time){
                    // if the time to execute the multiplan has come, then change status and start multiplan execution
                    this.protocol_status = "EXEC-MULTIPLAN";
                    this.bdi_control_loop()
                }else{
                    // otherwise wait a few milliseconds and retry
                    setTimeout(()=>{
                        this.bdi_control_loop()
                    },10)
                }
                return;
            }
            case "WAITING-MULTIPLAN":{
                setTimeout(()=>{
                    if (this.anti_lock>=80) 
                        this.protocol_status = "EXEC-SINGLEPLAN"
                    this.bdi_control_loop()
                },20)
                //if i not recive nothing i continue like single planner
                return;
            }
            default:{
                this.multicast_finito()
            }
        }
        /**/
    }
    /**
     * Multiplan execution: 
     * IN THE MULTI PLAN WE TRUST 
     */
    exec_multiplan(){
        console.log ("\n-----------EXEC-MULTIPLAN")
        this.planner.print_my_plan();
        let plan=this.planner.getMyPlan();
        //console.log(plan.action_list)
        if(!plan.is_empty()){
            let action=plan.pop_front()
            this.client.pickup()
            this.execute(action).then((status)=>{
                //console.log("done")
                if(!status){
                    this.multicast_finito()
                }else{
                    this.bdi_control_loop()
                }
            })
        }else{
            this.multicast_finito()
        }
    }

    /**
     * What the agent does when in single plan mode
     */
    exec_singleplan(){
        console.log ("\n-----------EXEC-SINGLEPLAN")
        let plan=this.planner.getMyPlan();
        if(!plan.is_empty() && !this.intentions.has_succeeded(this.beliefs) && !this.intentions.is_impossible(this.beliefs)){
            let action=plan.pop_front()
            this.client.pickup()
            this.execute(action).then((status)=>{
                if(!status){
                    this.planner.generateSinglePlan(this.intentions,this.beliefs,this.domain).then(()=>{
                        this.bdi_control_loop()}
                    ).catch(()=>{
                        this.start()
                    })
                    return;
                }

                if(this.intentions.reconsider(this.beliefs)){
                    let desires=new Desires(this.beliefs,this.intentions)
                    this.intentions.filter(this.beliefs,desires)
                }
                              
                if(! plan.is_sound(this.beliefs,this.intentions)){
                    this.planner.generateSinglePlan(this.intentions,this.beliefs,this.domain,this.domain).then(()=>{
                        this.bdi_control_loop()}
                    ).catch(()=>{
                        this.start()
                    })
                    return;
                }
                this.bdi_control_loop()
            })
        }else{
            setTimeout(()=>{
                let desires=new Desires(this.beliefs,this.intentions,this.domain)
                this.intentions.filter(this.beliefs,desires)
                this.planner.generateSinglePlan(this.intentions,this.beliefs,this.domain).then(()=>{
                    this.bdi_control_loop()}
                ).catch(()=>{
                    this.start()
                })
                return;
            },30);
        }
    }

    /**
     * perform sensing of the environment
    */
    async sensing(){
        let updates=[]
        updates.push(new Promise((res,rej)=>{
            this.client.onParcelsSensing((parcels)=>{
                this.beliefs.getParcelBeliefs().updateParcelsData(parcels)
                this.beliefs.getParcelBeliefs().updateLostParcels(this.beliefs.my_data)
                res()
            })
        }))
        updates.push(new Promise((res,rej)=>{
            this.client.onAgentsSensing((agents)=>{
                this.beliefs.getAgentBeliefs().updateAgentsData(agents)
                this.beliefs.getAgentBeliefs().updateLostAgents(this.beliefs.my_data)
                res()
            })
        }))
        await Promise.all(updates)
    }

    /**
     * Share my beliefs with the rest of the team
     */
    async share_beliefs(){
        for(let id of this.beliefs.friend_beliefs.keys()){
            this.communication.send_all_beliefs(id);
            this.communication.send_my_data(id);
        }
    }

    /**
     * Describes what the agent needs to do when it receives an update 
     * about a friend's data
     * @param {{x: number; y: number; id: string; score: number; name: string;}} data 
     */
    on_friend_update(data){
        this.beliefs.on_friend_update(data)
        this.planner.synchronize(data)
    }

    /**
     * Describes what the agent needs to do when it
     * receives beliefs from an allay
     * @param {{parcels: Synchronous_Parcels_DataBase;agents: Synchronous_Agents_DataBase;}} data 
     */
    on_beliefs_update(data){
        this.beliefs.on_parcel_update(data.parcels)
        this.beliefs.on_agents_update(data.agents)
    }

    /**
     * Describes what to do when a "finito" message is received
     * @param {string} from_id 
     */
    on_finito(from_id){
        this.beliefs.on_finito(from_id)
        this.planner.delete_plan(from_id)
        // If I get the last "finito" from my friends and I have already exited the multiplan stage, then I have to reply with my intentions 
        if(this.protocol_status!=="EXEC-MULTIPLAN" && this.beliefs.everyone_sent_finito()){
            this.protocol_status="WAITING-MULTIPLAN"
            let desires=new Desires(this.beliefs,this.intentions)
            this.intentions.filter(this.beliefs,desires)
            this.communication.send_intentions(from_id)
        }
    }


    /**
     * Describes what to do when intentions from some agent are shared
     * @param {Intentions} data
     * @param {string} from_friend
     */
    on_intentions_shared(from_friend,data){
        this.beliefs.on_intentions(from_friend,data.intentions)
        if(this.beliefs.everyone_sent_intentions()){
            // let's go baby, it's multi planning time
            let intention_map=this.beliefs.getIntentionsMap()
            intention_map.set(this.my_id,this.intentions)
            this.planner.generateMultiPlan(intention_map,this.beliefs,this.parallel_domain).then(
                ()=>{
                    this.multicast_multiplan(this.planner.serialize_multiplan())
                    this.beliefs.reset_friends()
                    this.protocol_status="READY-MULTIPLAN"
                }
            )
        }
    }

    /**
     * Add a new agent to the team
     * @param {string} friend_id
     */
    add_friend(friend_id){
        this.beliefs.add_friend(friend_id)
    }

    /**
     * Send the plan to all other friends
     * @param {[{key:string;plan:PlanObject;}]} multiplan
     */
    multicast_multiplan(multiplan){
        let now = new Date().getTime()
        this.multiplan_execution_time = now + constants.MULTIPLAN_DELAY;
        for(let friend of this.beliefs.getFriendBeliefs().keys())
            this.communication.send_plan(friend,multiplan,this.multiplan_execution_time)
    }

    /**
     * sets the new multiplan
     * @param {{plan:[{key:string;plan:PlanObject}];timestamp:number;}} data 
     */
    on_multiplan(data){
        console.log("received this plan")
        for(let x of data.plan){
            console.log(x.key)
            console.log(x.plan.action_list)
        }
        this.planner.deserialize_multiplan(data.plan)
        this.multiplan_execution_time = data.timestamp;
        this.beliefs.reset_friends()
        this.protocol_status="READY-MULTIPLAN"
    }

    /**
     * This function takes as input an action in the form of a string
     * among [left, right, up, down, pick_up, put_down, wait] and
     * returns a promise that tries to complete the desired action through 
     * the Deliveroo API. This promise resolves with a boolean that
     * says if the action was successfully completed or not.
     * @param {string} action 
     * @returns {Promise<boolean>}
     */
    execute(action){
        return new Promise((res,rej)=>{
            if(action === "left" || action=="right" || action=="up" || action=="down"){
                console.log("moving "+action)
                this.client.move(action).then((movement_status)=>{
                    if(!movement_status)
                        res(movement_status)
                    else{
                        //this.client.pickup().then((_pickup_status)=>{
                            /*if(this.beliefs.city.getDeliverySpots().includes({x:this.beliefs.my_data.x,y:this.beliefs.my_data.y})){
                                this.client.putdown().then((_putdown_status)=>{
                                    res(movement_status)
                                })
                            }else{
                                res(movement_status)
                            }*/
                            res(movement_status)
                        //})
                    }
                }).catch(()=>{
                    res(false)
                })
            }else if(action=="pick_up"){
                console.log("picking up")
                this.client.pickup().then((status)=>{
                    res(status)
                })
            }else if(action=="put_down" || action=="deliver"){
                console.log("putting down")
                this.client.putdown().then((status)=>{
                    res(status)
                })
            }else if(action=="wait"){
                console.log("waiting one action")
                setTimeout(()=>{res(true)},constants.TIME_FOR_ONE_ACTION)
            }else{
                console.log("error: invalid action: "+action)
                setTimeout(()=>{res(false)},1000)
            }
        })
    }
}
export{Agent}
