import { Beliefs } from "./beliefs.js";
import { Intention, Intentions } from "./intentions.js";
import { manhattan_distance } from "../../0_Common_Files/metrics.js";
import { onlineSolver, PddlProblem } from "@unitn-asa/pddl-client";


class PlanObject{
    /**
     * A list of strings describing actions that can be performed by the agent.
     * These actions can be: [left, right, up, down, pick_up, put_down, wait]
     * The first string of this array is the first action that the agent needs
     * to execute to follow the plan
     * @type {[string]}
     */
    action_list = []
    /**
     * A list of coordinates that are traversed to follow the plan
     * @type {[{x:number;y:number;}]}
     */
    shortest_path = []

    /**
     * Generate a new PlanObject
     * @param {[string]} actions 
     * @param {[{x:number;y:number;}]} path 
     */
    constructor(actions,path){
        this.action_list=actions
        this.shortest_path=path
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
        let enemys =  beliefs.getPositionOfEnemyAgents()
   
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
        let list_of_action = this.action_list.length;
        if (score_parcel < list_of_action){
            boolean_value = false
            }
        else boolean_value = true   

        return boolean_value
    }

    /**
     * Compute the position in which the agent will be after the plan is completed
     * @returns {{x:number;y:number;}}
     */
    getPositionObjective(){
        if(this.shortest_path.length==0)
            return {x:0,y:0}
        return this.shortest_path[this.shortest_path.length-1]
    }

    /**
     * This function takes the first action out from the action_list and returns it.
     * It also removes the next coordinate if the action is a moving action
     * If the action_list is empty, "error" will be returned
     * @returns {string}
     */
    pop_front(){
        if (this.action_list.length==0)
            return "error"
        else{
            let res = this.action_list.shift()
            if(res=="left" || res=="right" || res=="down" || res=="up" || res=="wait")
                this.shortest_path.shift()
            return res;
        }
    }

    /**
     * checks if there are actions left to perform
     * @returns {boolean}
     */
    is_empty(){
        return this.action_list.length==0
    }
}

class MultiPlan{
    /**
     * A map pairing agent ids with their assumed plan that is being followed
     * @type {Map<string,PlanObject}
     */
    plans 

    constructor(){
        this.plans=new Map()
    }

    /**
     * Add a new plan to the multiplan
     * @param {string} id 
     * @param {PlanObject} plan 
     */
    addPlan(id,plan){
        this.plans.set(id,plan)
    }

    /**
     * remove one action from all the plans 
     * @param {string} my_id the id of this agent 
     * @returns {string}
     */
    pop_front(my_id){
        if(!this.plans.has(my_id))
            return "error"
        let my_plan = this.plans.get(my_id)
        return my_plan.pop_front()
    }

    /**
     * check if my_plan (or the plan searched) has actions left
     * @param {string} my_id 
     * @returns {boolean}
     */
    is_empty(my_id){
        if(!this.plans.has(my_id))
            return true
        let my_plan = this.plans.get(my_id)
        return my_plan.is_empty()
    }

    /**
     * @param {Map<string,{x:number;y:number;}>} friends
     * synchronize with 
     */
    synchronize(friends){
        for(let [id,data] of friends){
            if(!this.plans.has(id))
                continue;
            let friend_plan=this.plans.get(id)
            if(friend_plan.shortest_path.length==0)
                continue;
            let first_coordinate=friend_plan.shortest_path[0]
            while(first_coordinate.x!=data.x && first_coordinate.y!=data.y){
                friend_plan.pop_front()
                if(friend_plan.shortest_path.length==0)
                    break;
                first_coordinate=friend_plan.shortest_path[0]
            }                
        }
    }

    /**
     * @param {string} id
     * @param {PlanObject} new_plan
     */
    on_plan_update(id,new_plan){
        this.plans.set(id,new_plan)
    }

    /**
     * Removes time spen waiting at the end of all plans
     */
    removeUselessWaiting(){
        for(let plan of this.plans.values()){
            while(!plan.is_empty() && plan.action_list[plan.action_list.length-1]=="wait"){
                plan.action_list.pop()
                plan.shortest_path.pop()
            }
        }
    }
}

class Planner{
    /**
     * @type {MultiPlan}
     */
    plans
    /**
     * @type {string}
     */
    my_agent

    /**
     * @param {string} id
     */
    constructor(id){
        this.my_agent=id
        this.plans=new MultiPlan()
    }

    /**
     * This function builds the plan to be followed to complete a multiplan
     * The goal is an Intention that has an action which can be from:
     * ["pick up", "go to", "put down", "wait"]
     * // TODO: compute sequence of actions to perform in order to achieve the goal
     * @param {Map<string,Intentions>} team_intentions
     * @param {Beliefs} beliefs
     * @param {string} domain
     */
    async generateMultiPlan(team_intentions,beliefs,domain){
        return this.generateMultiPlanGraphSearch(team_intentions,beliefs)
        //return this.generateMultiPlanPDDL(team_intentions,beliefs,domain)
    }

    /**
     * This function builds the plan to be followed using PDDL online solver
     * @param {Map<string,Intentions>} team_intentions
     * @param {Beliefs} beliefs
     * @param {string} domain
     */
    async generateMultiPlanPDDL(team_intentions,beliefs,domain){
        let agents_positions=beliefs.getPositionOfAllAgents()
        let enemy_positions=beliefs.getPositionOfEnemyAgents()

        // load bot predicates for PDDL problem
        let friend_list=[this.my_agent]
        let bot_variables=""
        let bot_predicates="(BOT agent_"+beliefs.my_data.id+") (incell agent_"+beliefs.my_data.id+" x"+beliefs.my_data.x+"y"+beliefs.my_data.y+") "        
        for(let [id,friend] of beliefs.getFriendBeliefs()){
            friend_list.push(id)
            bot_predicates+="(BOT agent_"+id+") (incell agent_"+id+" x"+friend.x+"y"+friend.y+") " 
        }
        for(let id of friend_list){
            bot_variables+="agent_"+id+" "
        }


        //load map predicates for the PDDL problem
        let map_variables=""
        let map_predicates=""
        let layout=beliefs.city.getLogicalLayout()

        let reachables=[]
        for(let friend of beliefs.getFriendBeliefs().values()){
            if(friend.x !== undefined){
                reachables.push(beliefs.city.getAllReachable(
                    {x:friend.x,y:friend.y},
                    {x:friend.x,y:friend.y},
                    enemy_positions
                ))
            }
        }

        function isInReachables(x,y){
            for(let rmap of reachables){
                if(rmap[x][y]>=0)
                    return true;
            }
            return false;
        }

        let team_positions=[]
        for(let friend of friend_list){
            if(friend==this.my_agent){
                team_positions.push({x:beliefs.my_data.x,y:beliefs.my_data.y})
            }else{
                let friend_data=beliefs.getFriendBeliefs().get(friend)
                team_positions.push({x:friend_data.x,y:friend_data.y})
            }
        }

        for(let x=0;x<beliefs.city.getWidth();x++){
            for(let y=0;y<beliefs.city.getHeight();y++){
                if(['P','D'].includes(layout[x][y]) && isInReachables(x,y)){
                    map_variables+="x"+x+"y"+y+" "

                    if(x>0 && ['P','D'].includes(layout[x-1][y]) && isInReachables(x-1,y)){
                        map_predicates+="(rightneighbour x"+x+"y"+y+" x"+(x-1)+"y"+y+") "
                    }
                    if(x<beliefs.city.getWidth()-1 && ['P','D'].includes(layout[x+1][y]) && isInReachables(x+1,y)){
                        map_predicates+="(leftneighbour x"+x+"y"+y+" x"+(x+1)+"y"+y+") "
                    }
                    if(y>0 && ['P','D'].includes(layout[x][y-1]) && isInReachables(x,y-1)){
                        map_predicates+="(upneighbour x"+x+"y"+y+" x"+x+"y"+(y-1)+") "
                    }
                    if(y<beliefs.city.getHeight()-1 && ['P','D'].includes(layout[x][y+1]) && isInReachables(x,y+1)){
                        map_predicates+="(downneighbour x"+x+"y"+y+" x"+x+"y"+(y+1)+") "
                    }
                    if(!(team_positions.includes({x:x,y:y}))){
                        map_predicates+="(free x"+x+"y"+y+") "
                    }
                    if(layout[x][y]=='D'){
                        map_predicates+="(isdelivery x"+x+"y"+y+") "
                    }
                    map_predicates+="(CELL x"+x+"y"+y+") "
                }
            }    
        }

        // load patrcel predicates for PDDL problem
        let parcel_predicates="";
        let parcel_variables=""
        let parcels=beliefs.getParcelBeliefs().getAllParcels()
        for(let p of parcels){
            parcel_variables+="parcel_"+p.id+" "
        }
        for(let p of parcels){
            parcel_predicates+="(PARCEL parcel_"+p.id+") "
            if(!p.carriedBy && isInReachables(p.x,p.y))
                parcel_predicates+="(onground parcel_"+p.id+") (incell parcel_"+p.id+" x"+p.x+"y"+p.y+") "
            else{
                if(friend_list.includes(p.carriedBy)){
                    parcel_predicates+="(inbagof parcel_"+p.id+" agent_"+p.carriedBy+") "
                }
            }
        }

        let intention_choice = this.choose_intentions(team_intentions);
        
        /*for(let [id,choice] of intention_choice)
            console.log(choice)*/

        let plan_objectives="and "
        // convert intention_choice to PDDL goal
        for(let [id,choice] of intention_choice){
            //console.log(id,":",choice)
            let goal=choice.intention
            if(goal.action === "pick up"){
                let parcel_id = goal.args[0]
                plan_objectives += "(isdelivered parcel_"+parcel_id+") "
            }else if(goal.action === "put down"){
                let agent_bag = beliefs.getParcelBeliefs().getMyBagFromId(id)
                //console.log("Bag of "+id+":a",agent_bag)
                if(agent_bag.length > 0){
                    let parcel_id = agent_bag[0].id
                    plan_objectives += "(isdelivered parcel_"+parcel_id+") "
                }
            }else if(goal.action === "go to"){
                plan_objectives += "(incell agent_"+id+" x"+goal.location.x+"y"+goal.location.y+") "
            }
        }

        let problem = new PddlProblem(
            'deliveroo',
            map_variables+bot_variables+parcel_variables,
            map_predicates+bot_predicates+parcel_predicates,
            plan_objectives
        )

        //console.log(plan_objectives)

        let pddlProblem = problem.toPddlString()

        //console.log(pddlProblem)

        return new Promise((res,rej)=> {
            onlineSolver( domain, pddlProblem ).then((pddlsteps)=>{
                if(pddlsteps===undefined){
                    console.log("plan not achievable")
                    let multiplan= new MultiPlan()
                    for(let id of friend_list){
                        multiplan.addPlan(id,new PlanObject([],[]))
                    }
                    this.plans=multiplan
                    res()
                }else{
                    //console.log(pddlsteps)
                    let multiplan= new MultiPlan()
                    for(let id of friend_list){
                        multiplan.addPlan(id,new PlanObject([],[]))
                    }
                    /** @type {Map<string,{x:number;y:number;}>} */
                    let current_bot_positions=new Map()
                    for(let friend of friend_list){
                        if(friend==this.my_agent){
                            current_bot_positions.set(friend,{x:beliefs.my_data.x,y:beliefs.my_data.y})
                        }else{
                            let friend_data=beliefs.getFriendBeliefs().get(friend)
                            current_bot_positions.set(friend,{x:friend_data.x,y:friend_data.y})
                        }
                    }

                    for(let step of pddlsteps){
                        //console.log(step)
                        if(step.action=="left" || step.action=="right" || step.action=="up" || step.action=="down"){
                            let acting_bot=step.args[0].substring(6)
                            let next_pos=step.args[2].substring(1)
                            let pos_split=next_pos.split("y")
                            let x_coord=parseInt(pos_split[0])
                            let y_coord=parseInt(pos_split[1])
                            let acting_bot_plan=multiplan.plans.get(acting_bot)
                            acting_bot_plan.action_list.push(step.action)
                            acting_bot_plan.shortest_path.push({x:x_coord,y:y_coord})
                            current_bot_positions.set(acting_bot,{x:x_coord,y:y_coord})
                            for(let friend of friend_list){
                                if(friend==acting_bot)
                                    continue;
                                let friend_plan=multiplan.plans.get(friend)
                                friend_plan.action_list.push("wait")
                                let last_friend_position=current_bot_positions.get(friend)
                                friend_plan.shortest_path.push({x:last_friend_position.x,y:last_friend_position.y})
                            }
                        }else if(["left_and_right","left_and_down","left_and_left","left_and_up","right_and_up",
                            "right_and_down","right_and_right","up_and_up","up_and_down","down_and_down"].includes(step.action)){
                            let actions=step.action.split("_and_")
                            let action1=actions[0]
                            let action2=actions[1]
                            let acting_bot1=step.args[0].substring(6)
                            let next_pos1=step.args[2].substring(1)
                            let pos_split1=next_pos1.split("y")
                            let x_coord1=parseInt(pos_split1[0])
                            let y_coord1=parseInt(pos_split1[1])
                            let acting_bot_plan1=multiplan.plans.get(acting_bot1)
                            acting_bot_plan1.action_list.push(action1)
                            acting_bot_plan1.shortest_path.push({x:x_coord1,y:y_coord1})
                            current_bot_positions.set(acting_bot1,{x:x_coord1,y:y_coord1})
                            let acting_bot2=step.args[3].substring(6)
                            let next_pos2=step.args[5].substring(1)
                            let pos_split2=next_pos2.split("y")
                            let x_coord2=parseInt(pos_split2[0])
                            let y_coord2=parseInt(pos_split2[1])
                            let acting_bot_plan2=multiplan.plans.get(acting_bot2)
                            acting_bot_plan2.action_list.push(action2)
                            acting_bot_plan2.shortest_path.push({x:x_coord2,y:y_coord2})
                            current_bot_positions.set(acting_bot2,{x:x_coord2,y:y_coord2})
                            for(let friend of friend_list){
                                if(friend==acting_bot1 || friend==acting_bot2)
                                    continue;
                                let friend_plan=multiplan.plans.get(friend)
                                friend_plan.action_list.push("wait")
                                let last_friend_position=current_bot_positions.get(friend)
                                friend_plan.shortest_path.push({x:last_friend_position.x,y:last_friend_position.y})
                            }
                        }else if(step.action=="deliver" || step.action=="put_down"){
                            let acting_bot=step.args[0].substring(6)
                            let acting_bot_plan=multiplan.plans.get(acting_bot)
                            acting_bot_plan.action_list.push("put_down")
                        }else if(step.action=="pick_up"){
                            let acting_bot=step.args[0].substring(6)
                            let acting_bot_plan=multiplan.plans.get(acting_bot)
                            acting_bot_plan.action_list.push("pick_up")
                        }
                    }
                    multiplan.removeUselessWaiting()
                    this.plans=multiplan;
                    res()
                }
            }).catch(()=>{
                console.log("API planning error")
                let multiplan= new MultiPlan()
                for(let id of friend_list){
                    multiplan.addPlan(id,new PlanObject([],[]))
                }
                this.plans=multiplan
                res()
            })
        });
    }

    /**
     * This function builds the plan to be followed using graph algorithms
     * @param {Map<string,Intentions>} team_intentions
     * @param {Beliefs} beliefs
     * @param {string} domain
     */
    async generateMultiPlanGraphSearch(team_intentions,beliefs,domain){
        let agents_positions=beliefs.getPositionOfAllAgents()
        let enemy_positions=beliefs.getPositionOfEnemyAgents()

        let friends = []
        for(let f of beliefs.getFriendBeliefs().keys()){
            friends.push(f)
        }

        let friend_position=[]
        for(let f of beliefs.getFriendBeliefs().values()){
            friend_position.push({x:f.x,y:f.y})
        }

        let intention_choice = this.choose_intentions(team_intentions);
        /** @type {Map<string,[{x:number;y:number;}]>} */
        let paths=new Map()
        for(let [id,data] of intention_choice){
            let goal = data.intention;
            let end = {x:goal.location.x, y: goal.location.y};
            let start;
            if(beliefs.my_data.id === id){
                start = {x: beliefs.my_data.x, y:beliefs.my_data.y};
            }else{
                let friend = beliefs.getFriendBeliefs().get(id)
                start = {x: friend.x, y: friend.y};
            }
            let astar_path = beliefs.city.getPath(start,end,start,enemy_positions) 
            let xy_path = astar_path.map(pos => {
                return {x:pos.x, y:pos.y}
            })
            xy_path=[start].concat(xy_path)
            paths.set(id,xy_path);
        }
        
        /*for(let [id,path]  of paths)
            console.log(path)*/


        friends.push(beliefs.my_data.id)
        let done=false
        for(let step=0;step<40;step+=1){
            for(let f1 of friends){
                for(let f2 of friends){
                    if(f1 !== f2){
                        console.log("ANALYSIS________________________________________________________")
                        let first_path = paths.get(f1);
                       
                        let first_start
                        if(f1 == beliefs.my_data.id){
                            first_start = {x: beliefs.my_data.x, y: beliefs.my_data.y};
                        }else{
                            let first_friend = beliefs.getFriendBeliefs().get(f1);
                            first_start = {x: first_friend.x, y: first_friend.y};
                        }
                        let second_path = paths.get(f2);
                        let second_start
                        if(f2 == beliefs.my_data.id){
                            second_start = {x: beliefs.my_data.x, y: beliefs.my_data.y};
                        }else{
                            let second_friend = beliefs.getFriendBeliefs().get(f2);
                            second_start = {x: second_friend.x, y: second_friend.y};
                        }
                        let first_end;
                        let second_end;
                        if(step >= first_path.length){
                            if(first_path.length == 0){
                                first_end = first_start
                            }else{
                                first_end = {x: first_path[first_path.length - 1].x, y:first_path[first_path.length - 1].y}
                            }
                        }else{
                            first_end = {x: first_path[step].x, y:first_path[step].y}
                        }
                        if(step >= second_path.length){
                            if(second_path.length == 0){
                                second_end = second_start
                            }else{
                                second_end = {x: second_path[second_path.length - 1].x, y: second_path[second_path.length - 1].y}
                            }
                        }else{
                            second_end = {x: second_path[step].x, y: second_path[step].y}
                        }
                        let int1 = intention_choice.get(f1);
                        let int2 = intention_choice.get(f2);
                        let first_lonely_path = beliefs.city.getPathStrict(first_start,first_end,first_start,friend_position).map(pos=>{return {x:pos.x,y:pos.y}})
                        let second_lonely_path = beliefs.city.getPathStrict(second_start,second_end,second_start,friend_position).map(pos=>{return {x:pos.x,y:pos.y}})

                        if(int1.intention.action=="put down" && int2.intention.action=="put down"){
                            // let one fail and one succeed
                            done=true
                            break;
                        }if(first_path.length>1 && first_lonely_path.length<=1 && int1.intention.action=="put down"){
                            console.log("DISTANCE IS ________________________________")
                            console.log(manhattan_distance(first_start,second_start))
                            if(manhattan_distance(first_start,second_start)>1){
                                let first_to_second_path = beliefs.city.getPath(first_start,second_start,first_start,enemy_positions)
                                first_to_second_path=first_to_second_path.map(pos=>{return {x:pos.x,y:pos.y}})
                                //console.log(first_to_second_path)
                                first_to_second_path = [first_start].concat(first_to_second_path)
                                let new_first_path = []
                                let new_second_path = []
                                let times_to_move = Math.floor(first_to_second_path.length/2)
                                for(let i=0;i<times_to_move;i+=1){
                                    new_first_path.push(first_to_second_path[i])
                                    new_second_path.push(first_to_second_path[first_to_second_path.length-1-i])
                                }
                                console.log(new_first_path)
                                console.log(new_second_path)
                                if(first_to_second_path.length % 2 != 0){
                                    new_first_path.push(first_to_second_path[times_to_move])
                                    new_second_path.push("wait")
                                    new_second_path.push("wait")
                                    times_to_move+=1
                                }
                                new_first_path.push("put down")  
                                new_first_path.push(new_first_path[times_to_move-2])
                                new_first_path.push("wait")
                                new_first_path.push("wait")
                                new_first_path.push("wait")
                                new_first_path.push("wait")
                                new_second_path.push("wait")
                                new_second_path.push("wait")
                                new_second_path.push(new_first_path[times_to_move-1]) 
                                new_second_path.push("pick up")
                                console.log(new_first_path)
                                console.log(new_second_path)
                                paths.set(f1,new_first_path)
                                paths.set(f2,new_second_path)
                            }else{
                                let zerozero=beliefs.exploration_spots.get("00")
                                let fourfour=beliefs.exploration_spots.get("44")
                                //console.log("DISTANCES")
                                //console.log(manhattan_distance(first_start,zerozero))
                                //console.log(manhattan_distance(second_start,zerozero))
                                if(manhattan_distance(first_start,zerozero)>manhattan_distance(second_start,zerozero)){
                                    let new_first_path=beliefs.city.getPath(first_start,zerozero,first_start,enemy_positions).map(pos=>{return {x:pos.x,y:pos.y}})
                                    new_first_path=[first_start].concat(new_first_path)
                                    let new_second_path=beliefs.city.getPath(second_start,fourfour,second_start,enemy_positions).map(pos=>{return {x:pos.x,y:pos.y}})
                                    new_second_path=[second_start].concat(new_second_path)
                                    paths.set(f1,new_first_path)
                                    paths.set(f2,new_second_path)
                                }else{
                                    let new_first_path=beliefs.city.getPath(first_start,fourfour,first_start,enemy_positions).map(pos=>{return {x:pos.x,y:pos.y}})
                                    new_first_path=[first_start].concat(new_first_path)
                                    let new_second_path=beliefs.city.getPath(second_start,zerozero,second_start,enemy_positions).map(pos=>{return {x:pos.x,y:pos.y}})
                                    new_second_path=[second_start].concat(new_second_path)
                                    paths.set(f1,new_first_path)
                                    paths.set(f2,new_second_path)
                                }
                            }
                            done=true;
                            break;
                        }
                        else if(second_path.length>1 && second_lonely_path.length<=1 && int2.intention.action=="put down"){
                            console.log("DISTANCE IS ________________________________")
                            console.log(manhattan_distance(first_start,second_start))
                            if(manhattan_distance(first_start,second_start)>1){
                                let second_to_first_path = beliefs.city.getPathStrict(second_start,first_start,second_start,enemy_positions)
                                second_to_first_path=second_to_first_path.map(pos=>{return {x:pos.x,y:pos.y}})
                                //console.log(second_to_first_path)
                                second_to_first_path = [second_start].concat(second_to_first_path)
                                let new_first_path = []
                                let new_second_path = []
                                let times_to_move = Math.floor(second_to_first_path.length/2)
                                console.log("Paths")
                                for(let i=0;i<times_to_move;i+=1){
                                    new_second_path.push(second_to_first_path[i])
                                    new_first_path.push(second_to_first_path[second_to_first_path.length-1-i])
                                }
                                console.log(new_first_path)
                                console.log(new_second_path)
                                if(second_to_first_path.length % 2 != 0){
                                    new_second_path.push(second_to_first_path[times_to_move])
                                    new_first_path.push("wait")
                                    new_first_path.push("wait")
                                    times_to_move+=1
                                }
                                new_second_path.push("put down")  
                                new_second_path.push(new_second_path[times_to_move-2])
                                new_second_path.push("wait")
                                new_second_path.push("wait")
                                new_second_path.push("wait")
                                new_second_path.push("wait")
                                new_first_path.push("wait")
                                new_first_path.push("wait")
                                new_first_path.push(new_second_path[times_to_move-1]) 
                                new_first_path.push("pick up")
                                //console.log(new_first_path)
                                //console.log(new_second_path)
                                paths.set(f1,new_first_path)
                                paths.set(f2,new_second_path)
                            }else{
                                let zerozero=beliefs.exploration_spots.get("00")
                                let fourfour=beliefs.exploration_spots.get("44")
                                //console.log("DISTANCES")
                                //console.log(manhattan_distance(first_start,zerozero))
                                //console.log(manhattan_distance(second_start,zerozero))
                                if(manhattan_distance(first_start,zerozero)>manhattan_distance(second_start,zerozero)){
                                    let new_first_path=beliefs.city.getPath(first_start,zerozero,first_start,enemy_positions).map(pos=>{return {x:pos.x,y:pos.y}})
                                    new_first_path=[first_start].concat(new_first_path)
                                    let new_second_path=beliefs.city.getPath(second_start,fourfour,second_start,enemy_positions).map(pos=>{return {x:pos.x,y:pos.y}})
                                    new_second_path=[second_start].concat(new_second_path)
                                    paths.set(f1,new_first_path)
                                    paths.set(f2,new_second_path)
                                }else{
                                    let new_first_path=beliefs.city.getPath(first_start,fourfour,first_start,enemy_positions).map(pos=>{return {x:pos.x,y:pos.y}})
                                    new_first_path=[first_start].concat(new_first_path)
                                    let new_second_path=beliefs.city.getPath(second_start,zerozero,second_start,enemy_positions).map(pos=>{return {x:pos.x,y:pos.y}})
                                    new_second_path=[second_start].concat(new_second_path)
                                    paths.set(f1,new_first_path)
                                    paths.set(f2,new_second_path)
                                }
                            }
                            done=true;
                            break;
                        }
                        //type1 X -> O <- Y
                        else if(second_end.x == first_end.x && second_end.y == first_end.y){
                            //let them fail
                            done = true;
                            break;
                        }else{
                            //type2 X -> Y && X <- Y
                            if(first_start.x==second_end.x && first_start.y==second_end.y && first_end.x==second_start.x && first_end.y==second_start.y){
                                
                                //trade
                                if(int1.intention.action == "put down" || int2.intention.action == "put down"){
                                    intention_choice.set(f1,int2);
                                    intention_choice.set(f2,int1);
                                    let new_path_first=[]
                                    let new_path_second=[]
                                    for(let i=0;i<step;i++){
                                        new_path_first.push(first_path[i])
                                        new_path_second.push(second_path[i])
                                    }
                                    if(int1.intention.action == "put down"){// f1 gives to f2
                                        new_path_first.push("put down");
                                        let new_first_end = {x: int2.location.x, y:int2.location.y};
                                        let first_astar_path = beliefs.city.getPath(first_start,new_first_end,first_start,enemy_positions);
                                        let first_xy_path=first_astar_path.map(pos =>{
                                            return {x:pos.x, y:pos.y};
                                        })
                                        for(let pos of first_xy_path){
                                            new_path_first.push(pos)
                                        }
                                        new_path_second.push("wait")
                                        new_path_second.push(first_start)
                                        new_path_second.push("pick up")
                                        let new_second_end = {x: int1.location.x, y:int1.location.y};
                                        let second_astar_path = beliefs.city.getPath(first_start,new_second_end,first_start,enemy_positions);
                                        let second_xy_path=second_astar_path.map(pos =>{
                                            return {x:pos.x, y:pos.y};
                                        })
                                        for(let pos of second_xy_path){
                                            new_path_second.push(pos)
                                        }
                                        paths.set(f1,new_path_first)
                                        paths.set(f2,new_path_second)
                                    }else{ // f2 gives to f1
                                        new_path_second.push("put down");
                                        let b_new_second_end = {x: int1.location.x, y:int1.location.y};
                                        let b_second_astar_path = beliefs.city.getPath(second_start,b_new_second_end,second_start,enemy_positions);
                                        let b_second_xy_path=b_second_astar_path.map(pos =>{
                                            return {x:pos.x, y:pos.y};
                                        })
                                        for(let pos of b_second_xy_path){
                                            new_path_second.push(pos)
                                        }
                                        new_path_first.push("wait")
                                        new_path_first.push(second_start)
                                        new_path_first.push("pick up")
                                        let b_new_first_end = {x: int1.location.x, y:int1.location.y};
                                        let b_first_astar_path = beliefs.city.getPath(second_start,b_new_first_end,second_start,enemy_positions);
                                        let b_first_xy_path=b_first_astar_path.map(pos =>{
                                            return {x:pos.x, y:pos.y};
                                        })
                                        for(let pos of b_first_xy_path){
                                            new_path_first.push(pos)
                                        }
                                        paths.set(f1,new_path_first)
                                        paths.set(f2,new_path_second)
                                    }
                                }else{
                                    //only trade paths and intentions
                                    intention_choice.set(f1,int2);
                                    intention_choice.set(f2,int1);
                                    let m=new Map()
                                    m.set(f1,int2)
                                    m.set(f2,int1)
                                    for(let [id,data] of m){
                                        let goal = data.intention;
                                        let end = {x:goal.location.x, y: goal.location.y};
                                        let start;
                                        if(beliefs.my_data.id === id){
                                            start = {x: beliefs.my_data.x, y:beliefs.my_data.y};
                                        }else{
                                            let friend = beliefs.getFriendBeliefs().get(id)
                                            start = {x: friend.x, y: friend.y};
                                        }
                                        let astar_path = beliefs.city.getPath(start,end,start,enemy_positions) 
                                        let xy_path = astar_path.map(pos => {
                                            return {x:pos.x, y:pos.y}
                                        })
                                        paths.set(id,xy_path);
                                    }
                                }
                                
                            }
                            done = true;
                            break;
                        }
                    }
                }
                if(done)
                    break;
            }
            if(done)
                break;
        }

        let multiplan = new MultiPlan()
        
        for(let [id,path] of paths){
            //console.log(id)
            //console.log(path)
            let start
            let shortest_path=[]
            let actions=[]
            let first_coord_found=false
            for(let step of path){
                if(step===undefined){
                    continue;
                }else if(step == "pick up"){
                    actions.push("pick_up")
                }else if(step == "put down"){
                    actions.push("put_down")
                }else if(step == "wait"){
                    actions.push("wait")
                }else{
                    if(!first_coord_found){
                        start=step
                        shortest_path.push(step)
                        first_coord_found=true
                    }else{
                        let direction=this.get_direction(start,step);
                        actions.push(direction)
                        shortest_path.push(step)
                        start = step;
                    }
                }
            }

            let intention = intention_choice.get(id)
            if(intention.intention.action == "pick up")
                actions.push("pick_up")
            if(intention.intention.action == "put down")
                actions.push("put_down")

            //console.log(shortest_path)
            //console.log(actions)
            //console.log(intention)

            let plan=new PlanObject(actions,shortest_path);
            multiplan.addPlan(id,plan)
        }

        this.plans=multiplan
        return new Promise((res,rej) => {
            res()
        })
    }

    /**
     * choose the best intention for each agent avoiding conflicts
     * @param {Map<string,Intentions>} team_intentions
     * @returns {Map<string, {intention: Intention;utility: number;list_id: number;}>} 
     */
    choose_intentions(team_intentions){
        /** @param {Map<string,{intention:Intention;utility:number;}>} intention_choice*/
        function find_conflicts(intention_choice){
            for(let [id1,i1] of intention_choice){
                for(let [id2,i2] of intention_choice){
                    if(id1==id2)
                        continue;
                    /** @type {Intention} */
                    let intention1=i1.intention
                    /** @type {Intention} */
                    let intention2=i2.intention
                    //console.log("i1 of "+id1+" is",i1)
                    //console.log("i2 of "+id2+" is",i2)
                    if(intention1.action !== intention2.action)
                        continue;
                    if(intention1.action==="pick up"){
                        let x1=intention1.location.x
                        let y1=intention1.location.y
                        let x2=intention2.location.x
                        let y2=intention2.location.y
                        if(x1==x2 && y1==y2)
                            return {id1:id1,id2:id2};
                    }
                }    
            }
            return null;
        }

        /** @type {Map<string,{intention:Intention;utility:number;list_id:number;}>} */
        let intention_choice=new Map()
        for(let [id,i] of team_intentions){
            let new_intention=new Intention(
                i.intentions[0].location.x,
                i.intentions[0].location.y,
                i.intentions[0].action,
                i.intentions[0].args
            )
            intention_choice.set(id,{
                intention: new_intention,
                utility: i.intentions[0].utility,
                list_id: 0
            })
        }

        let conflict=find_conflicts(intention_choice);
        while(conflict!==null){
            // fix conflict
            let choice_to_change=intention_choice.get(conflict.id2)
            let id_to_change=conflict.id2
            if(intention_choice.get(conflict.id1).utility < intention_choice.get(conflict.id2).utility){
                choice_to_change=intention_choice.get(conflict.id1)
                id_to_change=conflict.id1
            }
            let new_id=choice_to_change.list_id+1
            if(new_id<team_intentions.get(id_to_change).intentions.length){
                let intentions=team_intentions.get(id_to_change)
                let new_intention_data=intentions.intentions[new_id];
                let new_intention=new Intention(
                    new_intention_data.location.x,
                    new_intention_data.location.y,
                    new_intention_data.action,
                    new_intention_data.args
                )
                let new_choice={
                    intention: new_intention,
                    utility: new_intention_data.utility,
                    list_id: new_id
                }
                intention_choice.set(id_to_change,new_choice)
            }else{
                team_intentions.delete(id_to_change)
            }
            conflict=find_conflicts(intention_choice)
        }

        return intention_choice;
    }

    /**
     * This function builds the plan to be followed to complete the goal
     * which is the next intention to be achieved. After this function is
     * completed the action_list array will contain an array of actions that
     * the agent needs to perform to achieve the goal (not only movement, but also
     * picking up and dropping down)
     * The goal is an Intention that has an action which can be from:
     * ["pick up", "go to", "put down", "wait"]
     * @param {Intentions} intentions
     * @param {Beliefs} beliefs
     */
    async generateSinglePlan(intentions,beliefs,domain){
        let goal=intentions.getFront()

        let reachable=beliefs.city.getAllReachable(
            beliefs.my_data,
            beliefs.my_data,
            beliefs.getPositionOfAllAgents()
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
        if(goal.action === "pick up"){
            parcel_predicates+="(onground parcel) (incell parcel x"+goal.location.x+"y"+goal.location.y+") "
        }else if(goal.action === "put down"){
            parcel_predicates += "(inbagof parcel bot) "
        }
        let objective=""
        if(goal.action === "pick up"){
            objective = "and (inbagof parcel bot) (not (onground parcel))"
        }else if(goal.action === "put down"){
            objective = "and (isdelivered parcel)"
        }else if(goal.action === "go to"){
            objective = "and (incell bot x"+goal.location.x+"y"+goal.location.y+")"
        }

        let problem = new PddlProblem(
            "deliveroo",
            map_variables+'bot parcel',
            map_predicates+bot_predicates+parcel_predicates,
            objective
        )

        let pddlProblem = problem.toPddlString()

        //console.log(pddlProblem)

        return new Promise((res,rej)=> {
            if(goal.action==="wait"){
                let action_list=["wait"]
                let shortest_path=[]
                this.plans.addPlan(beliefs.my_data.id,new PlanObject(action_list,shortest_path))
                res()
            }else{
                onlineSolver( domain, pddlProblem ).then((pddlsteps)=>{
                    if(pddlsteps===undefined){
                        console.log("planning error")
                        let action_list=["wait"]
                        let shortest_path=[]
                        this.plans.addPlan(beliefs.my_data.id,new PlanObject(action_list,shortest_path))
                        res()
                    }else{
                        //console.log(pddlsteps)
                        let shortest_path=[];
                        let action_list=[];
                        for(let step of pddlsteps){
                            action_list.push(step.action)
                            if(step.action=="left" || step.action=="right" || step.action=="up" || step.action=="down"){
                                //console.log(step)
                                let next_pos=step.args[2].substring(1)
                                let pos_split=next_pos.split("y")
                                let x_coord_string=pos_split[0]
                                let y_coord_split=pos_split[1]
                                shortest_path.push({x:parseInt(x_coord_string),y:parseInt(y_coord_split)})
                            }
                        }
                        let plan_found=new PlanObject(action_list,shortest_path)
                        let loop_count=0
                        while(this.has_conflicts(plan_found)){
                            action_list.unshift("wait")
                            shortest_path.unshift(shortest_path[0])
                            plan_found=new PlanObject(action_list,shortest_path)
                            loop_count+=1
                            if(loop_count>50){
                                plan_found=new PlanObject(["wait"],[])
                                break;
                            }
                        }
                        this.plans.addPlan(this.my_agent,plan_found)
                        res()
                    }
                }).catch(()=>{
                    console.log("planning failed this time")
                    this.plans.addPlan(this.my_agent,new PlanObject([],[]))
                    res()
                })
            }
        })
    }

    /**
     * Checks if a new single plan has conflicts with other agents executing the multiplan
     * @param {PlanObject} new_plan 
     */
    has_conflicts(new_plan){
        for(let [id,plan] of this.plans.plans){
            if(id===this.my_agent)//dont check my plan conflicts with my older plan (since it will replace it)
                continue;
            let path=plan.shortest_path;
            let my_path=new_plan.shortest_path;
            for(let index=0;index<Math.min(path.length,my_path.length);index+=1){
                // c'è una coppia tipo path: [..., {1,1}, ...] my_path: [..., {1,1}, ...]
                if(path[index].x==my_path[index].x && path[index].y==my_path[index].y)
                    return true;
                if(index>0){
                    // c'è una coppia tipo path: [..., {1,1}, {1,2}, ...] my_path: [..., {1,2}, {1,1}, ...]
                    if(path[index-1].x==my_path[index].x && path[index-1].y==my_path[index].y &&
                        path[index].x==my_path[index-1].x && path[index].y==my_path[index-1].y)
                        return true;
                }
            }
        }
        return false;
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
     * Synchronize plans with current position of an allay
     * @param {Object} data 
     */
    synchronize(data){
        let id=data.id
        if(this.plans.plans.has(id)){
            let m=new Map()
            m.set(data.id,data)
            this.plans.synchronize(m)
        }
    }

    /**
     * Find my plan
     * @returns {PlanObject}
     */
    getMyPlan(){
        if(!this.plans.plans.has(this.my_agent))
            return new PlanObject([],[])
        let plan=this.plans.plans.get(this.my_agent);
        return plan;
    }

    /**
     * @param {MultiPlan} data
     */
    on_multiplan(data){
        this.plans=data
    }

    /**
     * Removes the plan from an agent
     * @param {string} id 
     */
    delete_plan(id){
        this.plans.plans.set(id,new PlanObject([],[]))
    }

    /**
     * Serializes this.plans
     */
    serialize_multiplan(){
        let object=[]
        for(let [id,plan] of this.plans.plans){
            object.push({
                key: id,
                plan: plan
            })
        }
        return object
    }

    /**
     * @param {[{key:string;plan:PlanObject;}]} data
     */
    deserialize_multiplan(data){
        this.plans=new MultiPlan()
        for(let entry of data){
            this.plans.addPlan(entry.key,new PlanObject(entry.plan.action_list,entry.plan.shortest_path))
        }
    }

    
    print_my_plan(){
        let my_plan=this.getMyPlan()
        console.log(my_plan.action_list)
    }
}


export{Planner, PlanObject, MultiPlan}
