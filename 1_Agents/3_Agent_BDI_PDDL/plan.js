import { Beliefs } from "./beliefs.js";
import { Intention, Intentions } from "./intentions.js";
import { Desire } from "./desires.js";
import { Graph,astar } from "../../0_Common_Files/astar_new.js";
import { manhattan_distance } from "../../0_Common_Files/metrics.js";
import { onlineSolver, PddlProblem } from "@unitn-asa/pddl-client";


class Plan{
    /**
     * A list of strings describing actions that can be performed by the agent.
     * These actions can be: [left, right, up, down, pick_up, put_down, wait]
     * The first string of this array is the first action that the agent needs
     * to execute to follow the plan
     * @type {[string]}
     */
    action_list = []
    /**
     * The intention that the plan is trying to achieve
     * @type {Intention}
     */
    goal
    position_goal
    /**
     * This function builds the plan to be followed to complete the goal
     * which is the next intention to be achieved. After this function is
     * completed the action_list array will contain an array of actions that
     * the agent needs to perform to achieve the goal (not only movement, but also
     * picking up and dropping down)
     * The goal is an Intention that has an action which can be from:
     * ["pick up", "go to", "put down", "wait"]
     * // TODO: compute sequence of actions to perform in order to achieve the goal
     * @param {Intentions} intentions
     * @param {Beliefs} beliefs
     */
    constructor(intentions,beliefs){
        this.goal=intentions.getFront()

        let reachable=beliefs.city.getAllReachable(
            beliefs.my_data,
            beliefs.my_data,
            beliefs.getAgentBeliefs().getPositionsOfAllAgents()
        )

        let map_variables=""
        let map_predicates=""
        for(let x=0;x<beliefs.city.getWidth();x++){
            for(let y=0;y<beliefs.city.getHeight();y++){
                if(reachable[x][y]>=0){
                    map_variables+="x"+x+"y"+y+" "

                    if(x>0 && reachable[x-1][y]>=0){
                        map_predicates+="(rightneighbour x"+x+"y"+y+" x"+(x-1)+"y"+y+") "
                    }
                    if(x<beliefs.city.getWidth()-1 && reachable[x+1][y]>=0){
                        map_predicates+="(leftneighbour x"+x+"y"+y+" x"+(x+1)+"y"+y+") "
                    }
                    if(y>0 && reachable[x][y-1]>=0){
                        map_predicates+="(upneighbour x"+x+"y"+y+" x"+x+"y"+(y-1)+") "
                    }
                    if(y<beliefs.city.getHeight()-1 && reachable[x][y+1]>=0){
                        map_predicates+="(downneighbour x"+x+"y"+y+" x"+x+"y"+(y+1)+") "
                    }
                    if(manhattan_distance({x:x, y:y},beliefs.my_data)!=0)
                        map_predicates+="(free x"+x+"y"+y+") "
                    map_predicates+="(CELL x"+x+"y"+y+") "
                }
            }    
        }
        for(let zone of beliefs.city.getDeliverySpots()){
            if(reachable[zone.x][zone.y]>=0){
                map_predicates+="(isdelivery x"+zone.x+"y"+zone.y+") "
            }
        }

        let bot_predicates="(BOT bot) (incell bot x"+beliefs.my_data.x+"y"+beliefs.my_data.y+") "        

        let parcel_predicates="(PARCEL parcel) "
        if(this.goal.action === "pick up"){
            parcel_predicates+="(onground parcel) (incell parcel x"+this.goal.location.x+"y"+this.goal.location.y+") "
        }else if(this.goal.action === "put down"){
            parcel_predicates += "(inbag parcel) "
        }
        let objective=""
        if(this.goal.action === "pick up"){
            objective = "and (inbag parcel) (not (onground parcel))"
        }else if(this.goal.action === "put down"){
            objective = "and (onground parcel) (incell parcel x"+this.goal.location.x+"y"+this.goal.location.y+") (not (inbag parcel))"
        }else if(this.goal.action === "go to"){
            objective = "and (incell bot x"+this.goal.location.x+"y"+this.goal.location.y+")"
        }

        let problem = new PddlProblem(
            'deliveroo',
            map_variables+'bot parcel',
            map_predicates+bot_predicates+parcel_predicates,
            objective
        )

        this.pddlProblem = problem.toPddlString()
    }


    /**
     * Call the PDDL API to get the plan and modify the plan structure
     * @param {string} domain
     * @returns {Promise<any>}
     */
    async getPlan(domain){
        // console.log(domain)
        // console.log(this.pddlProblem)
        return new Promise((res,rej)=> {
            if(this.goal.action==="wait"){
                this.action_list.push("wait")
                this.shortest_path=[]
                this.position_goal={x:0,y:0}
                res()
            }else{
                onlineSolver( domain, this.pddlProblem ).then((pddlsteps)=>{
                    if(pddlsteps===undefined){
                        console.log("planning error")
                        rej()
                    }else{
                        //console.log(pddlsteps)
                        this.shortest_path=[];
                        this.action_list=[];
                        for(let step of pddlsteps){
                            this.action_list.push(step.action)
                            if(step.action=="left" || step.action=="right" || step.action=="up" || step.action=="down"){
                               // console.log(step)
                                let next_pos=step.args[2].substring(1)
                                let pos_split=next_pos.split("y")
                                let x_coord_string=pos_split[0]
                                let y_coord_split=pos_split[1]
                                this.shortest_path.push({x:parseInt(x_coord_string),y:parseInt(y_coord_split)})
                            }
                        }
                        res()
                    }
                })
            }
        });
    }

    /**
     * this function return the possible position from My_pos to next_pos
     * @returns {direction_step}
     */
    get_direction( my_pos, next_pos) {
        const dx = Math.round(my_pos.x) - Math.round(next_pos.x)
        const dy = Math.round(my_pos.y) - Math.round(next_pos.y)
        if(dx==1)
            return 'left'
        else if(dx==-1)
            return 'right'
        else if(dy==1)
            return 'down'
        else
            return 'up'
    }


    /**
     * This function checks if the action_list array is an empty array and
     * returns a boolean describing the result
     * @returns {boolean}
     */
    is_empty(){
        return this.action_list.length == 0;
    }

    /**
     * This function checks if the current plan is sound, which means that
     * the plan makes sense given the current environment and intention.
     * For example, if there is an obstacle that won't move in the next position
     * we want to reach then the plan is not sound and this function returns false.
     * @param {Beliefs} beliefs
     * @param {Intentions} intentions
     * @returns {boolean}
     */
    is_sound(beliefs,intentions){
        let boolean_value = true
        
        let current_path = JSON.parse(JSON.stringify(this.shortest_path))
        let enemys =  beliefs.agentDB.getPositionsOfAllAgents()
   
        let current_intention = intentions.getFront()
        if (enemys.length === 0){
            console.log("nessun nemico")
        }
        //verifico se l'agente è sul mio percorso
        while (enemys.length>0 ){
            let enemy = enemys.shift() 
            current_path = JSON.parse(JSON.stringify(this.shortest_path))
            while (current_path.length>0){   
                
                let next_astar_pos = current_path.shift()
                if (next_astar_pos.x === enemy.x && next_astar_pos.y === enemy.y){
                    boolean_value = false
                }
            }
        
        }
        let parcels_on_ground=beliefs.getParcelBeliefs().getFreeParcels();
        //verifico se ci sono parcelle e se ho settato la condizione di pick up
        if (parcels_on_ground.length === 0  && current_intention.action === "pick up"){
            boolean_value = false
        }
        //verifico se la parcella che sto per prendere c'è ancora (score tempi)
        let score_parcel = parcels_on_ground.reward;
        let list_of_action =this.action_list.length;
        if (score_parcel < list_of_action){
            boolean_value = false
            }
        else boolean_value = true   

        return boolean_value
    }
    
    /**
     * This function takes the first action out from the action_list and returns it.
     * If the action_list is empty, "error" will be returned
     * @returns {string}
     */
    pop_front(){
        if (this.is_empty())
            return "error"
        else
            this.shortest_path.shift()
            return this.action_list.shift()
    }
}
export{Plan}
