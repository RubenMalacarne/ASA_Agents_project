import { Beliefs } from "./beliefs.js";
import { Intention, Intentions } from "./intentions.js";
import { Desire } from "./desires.js";
import { Graph,astar } from "../../0_Common_Files/astar_new.js";
import { manhattan_distance } from "../../0_Common_Files/metrics.js";


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
     * @param {Desire} desire
     */
    constructor(intentions,beliefs,desire,agent){
        //take the type of goal
        this.pos_agent= beliefs.my_data
        this.beliefs = beliefs

        this.goal=intentions.getFront()
        this.position_goal = intentions.getFront().location
        this.action_list = []

        if (this.position_goal === null){
            this.action_list.push("wait")
            return;
        }
        let x2 = this.position_goal.x
        let y2 = this.position_goal.y
        

        let available_matrix=this.beliefs.city.getMaskedPathLayout(this.beliefs.my_data,this.beliefs.agentDB.getPositionsOfAllAgents())
        let available_map=new Graph(available_matrix)
        //prendo la mia posizione e la metto sulla mappa che contiene i punti disponibili
        let my_available_pos = available_map.grid[this.pos_agent.x][this.pos_agent.y]
        //stessa cosa con il goal_pos
        let goal_available_pos = available_map.grid[x2][y2]
            
        this.shortest_path = astar.search(available_map,my_available_pos,goal_available_pos);
        
        let path_to_actiolist = JSON.parse(JSON.stringify(this.shortest_path)) //variabile fatta perche ogni volta il path usando shift mi si riduce
        
        this.stepBystep_actionList (path_to_actiolist,this.pos_agent, this.position_goal)

            if (this.goal.action === "pick up"){
                this.action_list.push("pick_up")
            }
            if (this.goal.action === "go to"){
                console.log ("exploration_plan")
            }
            if (this.goal.action === "put down"){
                this.action_list.push("put_down")
            }
            if (this.goal.action === "wait"){
                this.action_list.push("wait")
            }
        }

    /**
     * This function make the sequence of action that an agent must do
     * to achive the goal
     * @returns {}
     */
    stepBystep_actionList(shortest_path,my_pos,goal_pos){
        let last_position = my_pos
        while (shortest_path.length>0){
            let next_astar_pos = shortest_path.shift()
            let next_pos = {x:next_astar_pos.x , y:next_astar_pos.y}
            let direction = this.get_direction(last_position,next_pos)
            this.action_list.push(direction)
            // this.client.move(direction).then(()=>{this.action_list[i]})
            last_position = next_pos
        }
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
