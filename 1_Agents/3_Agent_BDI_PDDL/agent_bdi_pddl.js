import { DeliverooApi } from "@unitn-asa/deliveroo-js-client"
import { City_Map } from "../../0_Common_Files/citymap.js"
import { Beliefs } from "./beliefs.js"
import { Desires } from "./desires.js"
import { Intentions } from "./intentions.js"
import { Plan } from "./plan.js"
import { readFile } from "../../0_Common_Files/files.js"

class Agent{
    /**
     * The personal data about this agent, which includes id, position, name and current score
     * @type {{x: number; y: number; id: string; score: number; name: string;}}
     */
    my_data={}
    /**
     * The plan that is being executed right now by the agent
     * @type {Plan}
     */
    plan
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
     * This function is responsible for initializing all data structures that the agent needs to be
     * able to work properly
     * @param {DeliverooApi} client 
     */
    constructor(client){
        this.client=client
        this.city=new City_Map(this.client)
        this.beliefs=new Beliefs(this.client,this.city,this.my_data)
        this.intentions=new Intentions(this.beliefs)
        this.client.onYou((me)=>{
            this.my_data.x=Math.round(me.x)

            this.my_data.id=me.id
            this.my_data.y=Math.round(me.y)
            this.my_data.score=me.score
            this.my_data.name=me.name
            this.beliefs.getAgentBeliefs().updateLostAgents(this.my_data)
            this.beliefs.getParcelBeliefs().updateLostParcels(this.my_data)
        })
    }

    /**
     * This function must be called whenever an agent starts acting in the environment.
     * It starts the agents behaviour
     */
    async start(){
        this.domain = await readFile("./1_Agents/3_Agent_BDI_PDDL/domain.pddl");
        this.beliefs.load_exploration_spots()
        for(let zone of this.beliefs.exploration_spots.values()){ // If I am unable to load the exploration spots, then the map was not loaded -> agent cannot work
            if(zone===null){
                console.error("Error!!! The agent was unable to load the map.\n"+
                    "Check if the connection with the server is working or increase the loading time for the agent");
                process.exit(1);
            }
        }
        let desires=new Desires(this.beliefs,this.intentions)
        this.intentions.filter(desires)
        this.plan=new Plan(this.intentions,this.beliefs,this.domain)
        this.plan.getPlan(this.domain).then(()=>{
            this.bdi_control_loop()
        }).catch(()=>{
            this.start()
        })

    }

    /**
     * BDI control loop implemented as a recursive function that recurs whenever 
     * some asynchronous event is completed (to avoid blocking of information detection)
     */
    async bdi_control_loop(){
        let updates=[]
        updates.push(new Promise((res,rej)=>{
            this.client.onParcelsSensing((parcels)=>{
                this.beliefs.getParcelBeliefs().updateParcelsData(parcels)
                this.beliefs.getParcelBeliefs().updateLostParcels(this.beliefs.my_data)
            })
        }))
        updates.push(new Promise((res,rej)=>{
            this.client.onAgentsSensing((agents)=>{
                this.beliefs.getAgentBeliefs().updateAgentsData(agents)
                this.beliefs.getAgentBeliefs().updateLostAgents(this.beliefs.my_data)
            })
        }))
        Promise.all(updates)
        // console.log(this.beliefs.getParcelBeliefs().getMyBag(this.beliefs.my_data))
        // console.log(this.beliefs.getParcelBeliefs().getFreeParcels())
        // console.log(this.intentions.getFront())
        // console.log(this.plan.action_list)
        if(!this.plan.is_empty() && !this.intentions.has_succeeded() && !this.intentions.is_impossible()){
            let action=this.plan.pop_front()
            this.client.pickup()
            this.execute(action).then((status)=>{
                if(!status){
                    this.plan=new Plan(this.intentions,this.beliefs,this.domain)
                    this.plan.getPlan(this.domain).then(()=>{
                        this.bdi_control_loop()}
                    ).catch(()=>{
                        this.start()
                    })
                    return;
                }

                if(this.intentions.reconsider()){
                    let desires=new Desires(this.beliefs,this.intentions)
                    this.intentions.filter(desires)
                }
                console.log("is_sound value: "+ this.plan.is_sound(this.beliefs,this.intentions))
                              
                if(! this.plan.is_sound(this.beliefs,this.intentions)){
                    this.plan=new Plan(this.intentions,this.beliefs,this.domain)
                    this.plan.getPlan(this.domain).then(()=>{
                        this.bdi_control_loop()}
                    ).catch(()=>{
                        this.start()
                    })
                    return;
                }
                this.bdi_control_loop()
            })
        }else{
            //wait for possible updates from the environment
            setTimeout(()=>{
                let desires=new Desires(this.beliefs,this.intentions,this.domain)
                this.intentions.filter(desires)
                this.plan=new Plan(this.intentions,this.beliefs)
                this.plan.getPlan(this.domain).then(()=>{
                    this.bdi_control_loop()}
                ).catch(()=>{
                    this.start()
                })
                return;
            },30);
        }

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
                this.client.move(action).then((status)=>{
                    res(status)
                })
            }else if(action=="pick_up"){
                console.log("picking up")
                this.client.pickup().then((status)=>{
                    res(status)
                })
            }else if(action=="put_down"){
                console.log("putting down")
                this.client.putdown().then((status)=>{
                    res(status)
                })
            }else if(action=="wait"){
                console.log("waiting 1 s")
                setTimeout(()=>{res(true)},1000)
            }else{
                console.log("error: invalid action: "+action)
                setTimeout(()=>{res(false)},1000)
            }
        })
    }
}
export{Agent}