//code of Naive_Agent

import * as config from "../../config.js";
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { Graph, astar } from "../../0_Common_Files/astar_new.js";
import { manhattan_distance,get_direction } from "../../0_Common_Files/metrics.js";

const token = process.env.CLEVER_AGENT_TOKEN
//const token = process.env.FIRST_COMPETITION_TOKEN
const client = new DeliverooApi(
    config.host,
    token
)

const VIEW_DISTANCE=4
const LOST = 'LOST'
const SIZE_LIMIT=100;



class Naive_agent_Strategy{
    /**
     * @type {string}
     */
    behaviour = "explore"
    /**
     * @type {{x: number; y: number;, parcel_id: string;} | {x: number; y: number;} | null}
     */
    objective = null


    /**
     * @param {Agent} agent 
     */
    constructor(agent){
        this.client=agent.client;
        this.agent=agent;
    }


    apply_behaviour(){
        if(this.objective===null)
            this.behaviour="explore"
        console.log("Status: ",this.agent.my_data)
        if ( this.behaviour === "explore" ){
            console.log("exploring", this.objective)
            this.apply_exploration()
        } else if ( this.behaviour === "go pick up" ){
            console.log("picking up",this.objective)
            this.apply_go_pick_up()
        } else if ( this.behaviour === "go drop" ){
            console.log("dropping", this.objective)
            this.apply_go_drop()
        } else if ( this.behaviour === "stop" ){
            console.log("stopped agent execution")
            process.exit(0)
        } else if ( this.behaviour === "explore or drop" ){
            console.log("exploring or dropping")
            this.apply_explore_or_drop()
        } else {
            this.reset_behaviour()
        }
    }

    reset_behaviour(){
        console.log("something went wrong while applying the strategy, going back to default")
        this.behaviour = "explore"
        this.objective = null
        this.apply_behaviour()
    }

    /**
     * @type {Map<string, {x:number;y:number;}>}
     * value of each possible position
     * point nord,sud,hest,west of our map (possible point)
     */
    exploration_spots=new Map()
    load_exploration_spots(){
    
        this.exploration_spots.set("center",this.agent.city.findClosestSpotFromCenter(Math.trunc(this.agent.city.getWidth() /2),Math.trunc(this.agent.city.getHeight() /2)));
        this.exploration_spots.set("n",this.agent.city.findClosestSpotFromCenter(Math.trunc(this.agent.city.getWidth() /2),Math.trunc(this.agent.city.getHeight() *3/4)));
        this.exploration_spots.set("s",this.agent.city.findClosestSpotFromCenter(Math.trunc(this.agent.city.getWidth() /2),Math.trunc(this.agent.city.getHeight() /4)));
        this.exploration_spots.set("w",this.agent.city.findClosestSpotFromCenter(Math.trunc(this.agent.city.getWidth() /4),Math.trunc(this.agent.city.getHeight() /2)));
        this.exploration_spots.set("e",this.agent.city.findClosestSpotFromCenter(Math.trunc(this.agent.city.getWidth() *3/4),Math.trunc(this.agent.city.getHeight() /2)));
        this.exploration_spots.set("ne",this.agent.city.findClosestSpotFromCenter(Math.trunc(this.agent.city.getWidth() *3/4),Math.trunc(this.agent.city.getHeight() *3/4)));
        this.exploration_spots.set("se",this.agent.city.findClosestSpotFromCenter(Math.trunc(this.agent.city.getWidth() /4),Math.trunc(this.agent.city.getHeight() *3/4)));
        this.exploration_spots.set("nw",this.agent.city.findClosestSpotFromCenter(Math.trunc(this.agent.city.getWidth() *3/4),Math.trunc(this.agent.city.getHeight() /4)));
        this.exploration_spots.set("sw",this.agent.city.findClosestSpotFromCenter(Math.trunc(this.agent.city.getWidth() /4),Math.trunc(this.agent.city.getHeight() /4)));
    }

    /**
     * 
     * @returns {[{x:number; y:number}]}
     */
    getReachableExplorationObjectives(){
        let available_matrix=this.agent.city.getMaskedPathLayout(this.agent.my_data,this.agent.agentDB.getPositionsOfAllAgents())
        let available_map=new Graph(available_matrix)
        let starting_position = available_map.grid[this.agent.my_data.x][this.agent.my_data.y]
        let res=[]

        for(let [pippo,obj] of this.exploration_spots){
            let goal_position = available_map.grid[obj.x][obj.y]
            let shortest_path = astar.search(available_map,starting_position,goal_position);
            if(shortest_path.length != 0){
                res.push(obj)
            }
        }
    //res contain each possible position of the nord,sud,est ovest ....

        return res
    }

    apply_exploration(){
        if(this.objective === null){
            this.objective = this.exploration_spots.get("center")
        }
        let closest_parcel = this.agent.findClosestParcel()
        if(closest_parcel !== null){
            this.behaviour = "go pick up"
            this.objective = {x: closest_parcel.x, y: closest_parcel.y, parcel_id: closest_parcel.id}
            this.apply_go_pick_up();
            return;
        }
        this.go_center()
    }
    
    go_center_clockwise (){
        if(this.objective===null){
            let reachable = this.getReachableExplorationObjectives()
            if(reachable.length>0) this.objective=reachable[Math.floor(Math.random()*reachable.length)]
        let direction=['left','up','right','down','up'][ Math.floor(Math.random()*4) ]
        this.client.move(direction).then(()=>{
            this.apply_behaviour()
        })
    }
    }

    go_center(){
        if(this.objective===null){
            let reachable = this.getReachableExplorationObjectives()
            if(reachable.length>0)
                this.objective=reachable[Math.floor(Math.random()*reachable.length)]
            let direction=['left','up','right','down','up'][ Math.floor(Math.random()*4) ]

            this.client.move(direction).then(()=>{
                this.apply_behaviour()
            })
        }else if(manhattan_distance(this.agent.my_data,this.objective)==0){
            let last_objective = this.objective
            let reachable = this.getReachableExplorationObjectives()
            this.objective=reachable[Math.floor(Math.random()*reachable.length)]
            if(this.objective.x == last_objective.x && this.objective.y == last_objective.y){
                this.objective = null
                let direction = ['left','up','right','down','up'][ Math.floor(Math.random()*4) ]
                this.client.move(direction).then(()=>{
                    this.apply_behaviour()
                })
            }else{
                this.apply_behaviour()
            }
        }else{
            let available_matrix=this.agent.city.getMaskedPathLayout(this.agent.my_data,this.agent.agentDB.getPositionsOfAllAgents())
            let available_map=new Graph(available_matrix)
            let starting_position = available_map.grid[this.agent.my_data.x][this.agent.my_data.y]
            let goal_position = available_map.grid[this.objective.x][this.objective.y]
            let shortest_path = astar.search(available_map,starting_position,goal_position);
            if(shortest_path.length > 0){
                let next_position = {x:shortest_path[0].x,y:shortest_path[0].y};
                let direction = get_direction(this.agent.my_data,next_position)
                this.client.move(direction).then((status)=>{this.apply_behaviour()})
            }else{
                this.objective=null
                let direction=['left','up','right','down','up'][ Math.floor(Math.random()*4) ]
                this.client.move(direction).then(()=>{
                    this.apply_behaviour()
                })
            }
        }
    }

    apply_explore_or_drop(){
        let closest_drop=this.agent.findClosestDeliverySpot()
        if(closest_drop !== null){
            this.behaviour="go drop"
            this.objective=closest_drop
            this.apply_go_drop()
        }else{
            this.apply_exploration()
        }
    }

    async apply_go_drop(){
        if(manhattan_distance(this.agent.my_data,this.objective) == 0){
            // objective reached, pick up parcel
            this.client.putdown().then(()=>{
                this.behaviour="explore"
                this.objective=null
                this.apply_behaviour()
            })
        }else{
            let closest_drop = this.agent.findClosestDeliverySpot()
            if(closest_drop !== null && closest_drop.x != this.objective.x && closest_drop.y!=this.objective.y){
                this.objective=closest_drop
            }
            if(closest_drop === null){
                this.behaviour="explore or deliver"
                this.objective=null
                this.apply_behaviour()
                return;
            }
            if(manhattan_distance(closest_drop,this.agent.my_data) == 0){
                this.client.putdown().then(()=>{
                    this.behaviour = "explore"
                    this.objective = null
                    this.apply_behaviour()
                })
            }else{
                let closest_parcel=this.agent.findClosestParcel()
                if (closest_parcel !== null && manhattan_distance(closest_parcel,this.agent.my_data) == 0){
                    await this.client.pickup();
                }
                let available_matrix=this.agent.city.getMaskedPathLayout(this.agent.my_data,this.agent.agentDB.getPositionsOfAllAgents())
                let available_map=new Graph(available_matrix)
                let starting_position = available_map.grid[this.agent.my_data.x][this.agent.my_data.y]
                let goal_position = available_map.grid[this.objective.x][this.objective.y]
                let shortest_path = astar.search(available_map,starting_position,goal_position);
                if(shortest_path.length == 0){
                    this.behaviour = "explore or deliver"
                    this.objective = null
                    this.apply_behaviour()
                }else{
                    let next_position = {x:shortest_path[0].x,y:shortest_path[0].y};
                    if(manhattan_distance(this.agent.my_data,next_position)==1){
                        let direction = get_direction(this.agent.my_data,next_position)
                        this.client.move(direction).then(
                            (status)=>{
                                this.apply_behaviour()
                            }
                        )
                    }else{// this should never happen because we can only move one step at a time
                        this.reset_behaviour()
                    }
                }
            }
        }
    }

    async apply_go_pick_up(){
        if(manhattan_distance(this.agent.my_data,this.objective)==0){
            // objective reached, pick up parcel
            this.client.pickup().then(()=>{
                this.behaviour="go drop"
                this.objective=this.agent.findClosestDeliverySpot();
                this.apply_behaviour()
            })
        }else{
            let closest_parcel=this.agent.findClosestParcel()
            if(this.agent.parcelDB.getParcelFromId(this.objective.parcel_id) === null){// the parcel I wanted to pick up is not there anymore
                if (closest_parcel === null){
                    this.behaviour = "explore"
                    this.objective = null
                    this.apply_behaviour()
                    return;
                }else{
                    this.objective={x:closest_parcel.x, y:closest_parcel.y, parcel_id: closest_parcel.id}
                }
            }
            if (closest_parcel !== null && manhattan_distance(closest_parcel,this.agent.my_data) == 0){
                await this.client.pickup();
            }
            else if(closest_parcel !== null && closest_parcel.id != this.objective.parcel_id){
                this.objective={x:closest_parcel.x,y:closest_parcel.y,parcel_id:closest_parcel.id}
            }
            let closest_drop=this.agent.findClosestDeliverySpot();
            if(manhattan_distance(closest_drop,this.agent.my_data) == 0){
                await this.client.putdown();
            }
            let available_matrix=this.agent.city.getMaskedPathLayout(this.agent.my_data,this.agent.agentDB.getPositionsOfAllAgents())
            let available_map=new Graph(available_matrix)
            let starting_position = available_map.grid[this.agent.my_data.x][this.agent.my_data.y]
            let goal_position = available_map.grid[this.objective.x][this.objective.y]
            let shortest_path = astar.search(available_map,starting_position,goal_position);
            if(shortest_path.length == 0){
                console.log("no path")
                this.objective = null
                this.behaviour = "explore"
                this.apply_behaviour()
            }else{
                let next_position = {x:shortest_path[0].x,y:shortest_path[0].y};
                if(manhattan_distance(this.agent.my_data,next_position) == 1){
                    let direction = get_direction(this.agent.my_data,next_position)
                    this.client.move(direction).then(
                        (status)=>{
                            this.apply_behaviour()
                        }
                    )
                }else{// this should never happen because we can only move one step at a time
                    this.reset_behaviour()
                }
            }
        }
    }
}

export {Naive_agent_Strategy}