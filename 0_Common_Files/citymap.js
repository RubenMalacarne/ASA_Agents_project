import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { manhattan_distance } from "./metrics.js";
import { Graph, astar } from "./astar_new.js";

class City_Map{
    /**
     * @type {[[number]]}
     */
    path_layout=[]
    /**
     * @type {[[string]]}
     */
    logical_layout=[]
    /**
     * @type {[{x:number; y:number;}]}
     */
    delivery_spots=[]
    /**
     * @type {number}
     */
    width=0
    /**
     * @type {number}
     */
    height=0
     /**
     * The personal data about this agent, which includes id, position, name and current score
     * @type {{x: number; y: number; id: string; score: number; name: string;}}
     */
     my_data={}
    /**
    * @param {DeliverooApi} client
    */
    constructor(client){
        this.client = client;
        client.onTile((x,y,is_delivery)=>{this.updateLayout(x,y,is_delivery)})  
        client.onYou((me)=>{
            this.my_data.id=me.id
            this.my_data.x=Math.round(me.x)
            this.my_data.y=Math.round(me.y)
        })
    }

    /**
     * Build the map from the map API info
     * @param {number} width 
     * @param {number} height 
     * @param {[{x:number;y:number;delivery:boolean;}]} tiles 
     */
    from_map_api(width,height,tiles){
        this.width=width
        this.height=height
        this.path_layout=[]
        this.logical_layout=[]
        this.delivery_spots=[]
        for(let x=0;x<width;x++){
            let row_1=[]
            let row_2=[]
            for(let y=0;y<height;y++){
                row_1.push('E')
                row_2.push(0)
            }
            this.logical_layout.push(row_1)
            this.path_layout.push(row_2)
        }
        for(let tile of tiles){
            this.path_layout[tile.x][tile.y]=1
            if(tile.delivery){
                this.logical_layout[tile.x][tile.y]='D'
                this.delivery_spots.push({x:tile.x,y:tile.y})
            }else{
                this.logical_layout[tile.x][tile.y]='P'
            }
        }
    }

    /**
     * Build the right map and our position
     * @param {number} width 
     * @param {number} height 
     * @param {[{x:number;y:number;delivery:boolean;}]} tiles 
     */
    viewmatrix_map(){
        console.log("Matrix map is:")
        //console.log (map_layout) 
        let mapp = JSON.parse(JSON.stringify(this.logical_layout));
        mapp.length
        let numRows = 0
        let numCols = 0
        for (var i = 0; i <mapp.length; i++){
        numRows++
        numCols = mapp[i].length
        }
    
        for (var i = 0; i < numRows; i++) {
        var i_row = "                ";
        for (var j = 0; j < numCols; j++) {

            if (mapp[i][j]=='E') {i_row += " " + " "}
            else if (i == this.my_data.x && j == this.my_data.y) i_row += '\x1b[33mX\x1b[0m' + " "
            else{i_row += mapp[i][j] + " "}
        }
        console.log(i_row);}
        console.log("number of colums: "+numCols);
        console.log("number of rows: "+numRows);
        return numCols,numRows
    } 
     
    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @param {boolean} is_delivery 
     */
    updateLayout(x,y,is_delivery){
        this.updateWidthAndHeight(x+1,y+1);
        this.logical_layout[x][y]='P'
        this.path_layout[x][y]=1
        if(is_delivery){
            this.delivery_spots.push({x: x, y: y})
            this.logical_layout[x][y]='D'
        }
    }

    /**
     * 
     * @param {number} x 
     * @param {number} y 
     */
    updateWidthAndHeight(x,y){
        if(x>this.width){
            for(let i=0;i<x-this.width;i+=1){
                this.path_layout.push([])
                this.logical_layout.push([])
            }
            this.width=x;
        }
        if(y>this.height){
            this.height=y;
        }
        for(let row of this.path_layout){
            while(row.length != this.height){
                row.push(0)
            }
        }
        for(let row of this.logical_layout){
            while(row.length != this.height){
                row.push('E')
            }
        }
    }

    /**
     * 
     * @returns {[[number]]}
     */
    getPathLayout(){
        return this.path_layout
    }

    /**
     * @returns {[[string]]}
     */
    getLogicalLayout(){
        return this.logical_layout
    }

    /**
     * @param {[{x:number; y:number; is_lost: boolean;}]} agent_positions
     * @param {[{x:number; y:number;}]} my_position
     * @returns {[[number]]}
     */
    getMaskedPathLayout(my_position,agent_positions){
        let copied_layout = JSON.parse(JSON.stringify(this.path_layout));
        for(let agent of agent_positions){
            if(agent.x>=this.width || agent.y>=this.height)//ignore agents in unloaded parts of the map
                continue;
            if(!agent.lost)
                copied_layout[agent.x][agent.y]=0;
            else{
                // metric to decide about forgetting about a far away believed agent
                if(manhattan_distance(my_position,{x:agent.x,y:agent.y})<=VIEW_DISTANCE+5){
                    copied_layout[agent.x][agent.y]=0;
                }
            }
        }
        return copied_layout
    }

    /**
     * @param {[{x:number; y:number; is_lost: boolean;}]} agent_positions
     * @param {[{x:number; y:number;}]} my_position
     * @returns {[[number]]}
     */
    getMaskedPathLayoutStrict(my_position,agent_positions){
        let copied_layout = JSON.parse(JSON.stringify(this.path_layout));
        for(let agent of agent_positions){
            if(agent.x>=this.width || agent.y>=this.height)//ignore agents in unloaded parts of the map
                continue;
            if(!agent.lost)
                copied_layout[agent.x][agent.y]=0;
            else{
                // metric to decide about forgetting about a far away believed agent
                    copied_layout[agent.x][agent.y]=0;
            }
        }
        return copied_layout
    }

    /**
     * @param {[{x:number; y:number; is_lost: boolean;}]} agent_positions
     * @returns {[[number]]}
     */
    getLogicalLayoutWithAgents(agent_positions){
        let copied_layout = JSON.parse(JSON.stringify(this.logical_layout));
        for(let [x,y,lost] of agent_positions){
            if(x>=this.width || y>=this.height)//ignore agents in unloaded parts of the map
                continue;
            if(!lost)
                copied_layout[x][y]='A';
            else{
                copied_layout[x][y]='L';
            }
        }
        return copied_layout
    }
    
    /**
     * 
     * @param {[{id: string; x: number; y: number; carriedBy: string; reward: number;}]} parcels 
     * @param {{x: number; y: number;}} my_position
     * @param {[{x:number; y:number; is_lost: boolean;}]} agent_positions
     * @returns {{id: string; x: number; y: number; carriedBy: string; reward: number;} | null}
     */
    findClosestParcel(my_position,agent_positions,parcels){
        let closest = null;
        let min_dist = this.width * this.height + 1;// the total amount of cells in the map is the worst case
        let searching_map = this.getMaskedPathLayout(my_position,agent_positions);
        let available_map = new Graph(searching_map);
        let starting_position = available_map.grid[my_position.x][my_position.y]
        let free_parcels=parcels.filter(p=>!p.carriedBy)
        for(let parcel of free_parcels){
            if(parcel.x >= this.width || parcel.y >= this.height)//avoid parcels in unloaded parts of the map
                continue;
            if(manhattan_distance(my_position,parcel) == 0)
                return parcel;
            if(searching_map[parcel.x][parcel.y] == 0)
                continue;
            let deliver_position = available_map.grid[parcel.x][parcel.y];
            let shortest_path = astar.search(available_map,starting_position,deliver_position);
            if( min_dist > shortest_path.length && shortest_path.length > 0){
                min_dist = shortest_path.length
                closest = parcel
            }
        }
        return closest
    }

    findClosestParcelWithoutObstacles(my_position,parcels){
        let closest = null;
        let min_dist = this.width * this.height + 1;// the total amount of cells in the map is the worst case
        let available_map = new Graph(this.path_layout);
        let starting_position = available_map.grid[my_position.x][my_position.y]
        let free_parcels=parcels.filter(p=>!p.carriedBy)
        for(let parcel of free_parcels){
            if(parcel.x >= this.width || parcel.y >= this.height)//avoid parcels in unloaded parts of the map
                continue;
            if(manhattan_distance(my_position,parcel) == 0)
                return parcel;
            if(searching_map[parcel.x][parcel.y] == 0)
                continue;
            let deliver_position = available_map.grid[parcel.x][parcel.y];
            let shortest_path = astar.search(available_map,starting_position,deliver_position);
            if( min_dist > shortest_path.length && shortest_path.length > 0){
                min_dist = shortest_path.length
                closest = parcel
            }
        }
        return closest
    }

    /**
     * 
     * @param {{x: number; y: number;}} my_position 
     * @param {[{x:number; y:number; is_lost: boolean;}]} agent_positions
     * @returns {null | {x:number; y:number;}}
     */
    findClosestDeliverySpot(my_position,agent_positions){
        let masked_map=this.getMaskedPathLayout(my_position,agent_positions)
        let available_map=new Graph(masked_map)
        let closest = null
        let min_dist = this.width * this.height + 1;// the total amount of cells in the map is the worst case
        let starting_position = available_map.grid[my_position.x][my_position.y]
        for(let spot of this.delivery_spots){
            if(masked_map[spot.x][spot.y] == 0)
                continue;
            if(manhattan_distance(my_position,{x:spot.x,y:spot.y}) == 0)
                return spot;
            let deliver_position = available_map.grid[spot.x][spot.y]
            let shortest_path = astar.search(available_map,starting_position,deliver_position)
            if( min_dist > shortest_path.length && shortest_path.length > 0){
                min_dist = shortest_path.length
                closest = spot
            }
        }
        return closest
    }

    /**
     * 
     * @param {{x: number; y: number;}} my_position 
     * @returns {null | {x:number; y:number;}}
     */
    findClosestDeliverySpotWithoutAgents(my_position){
        let available_map=new Graph(this.path_layout)
        let closest = null
        let min_dist = this.width * this.height + 1;// the total amount of cells in the map is the worst case
        let starting_position = available_map.grid[my_position.x][my_position.y]
        for(let spot of this.delivery_spots){
            if(masked_map[spot.x][spot.y] == 0)
                continue;
            if(manhattan_distance(my_position,{x:spot.x,y:spot.y}) == 0)
                return spot;
            let deliver_position = available_map.grid[spot.x][spot.y]
            let shortest_path = astar.search(available_map,starting_position,deliver_position)
            if( min_dist > shortest_path.length && shortest_path.length > 0){
                min_dist = shortest_path.length
                closest = spot
            }
        }
        return closest
    }

    /**
     * @returns {[{x: number; y:number;}]}
     */
    getDeliverySpots(){
        return this.delivery_spots
    }

    /**
     * 
     * @param {number} center_x 
     * @param {number} center_y 
     * @returns {{x:number;y:number;} | null}
     */
    findClosestSpotFromCenter(center_x,center_y){
        let closest_to_center = null
        for(let x=0;x<this.width;x++){
            for(let y=0;y<this.height;y++){
                if(this.path_layout[x][y]!==0 && (closest_to_center === null || 
                                                                                manhattan_distance({x:center_x,y:center_y},{x:x,y:y}) <
                                                                                manhattan_distance({x:center_x,y:center_y},{x:closest_to_center.x,y:closest_to_center.y}))){
                    closest_to_center={x:x,y:y}
                }
            }
        }
        return closest_to_center
    }

    /**
     * 
     * @returns {number}
     */
    getWidth(){
        return this.width;
    }

    /**
     * 
     * @returns {number}
     */
    getHeight(){
        return this.height;
    }

    /**
     * 
     * @param {{x: number; y: number;}} my_position 
     * @param {[{x:number; y:number; is_lost: boolean;}]} agent_positions
     * @param {{x:number;y:number;} } start 
     * @param {{x:number;y:number;} } end 
     */
    getPath(start,end,my_position,agent_positions){
     
        let map=this.getMaskedPathLayout(my_position,agent_positions);
        let graph=new Graph(map);
        let starting_pos=graph.grid[start.x][start.y]
        let ending_pos=graph.grid[end.x][end.y]
        return astar.search(graph,starting_pos,ending_pos)
    }

    getPathStrict(start,end,my_position,agent_positions){
     
        let map=this.getMaskedPathLayoutStrict(my_position,agent_positions);
        let graph=new Graph(map);
        let starting_pos=graph.grid[start.x][start.y]
        let ending_pos=graph.grid[end.x][end.y]
        return astar.search(graph,starting_pos,ending_pos)
    }

    /**
     * 
     * @param {{x:number;y:number;} } start 
     * @param {{x:number;y:number;} } end 
     */
    getPathIgnoringAgents(start,end){
        let map=this.path_layout
        let graph=new Graph(map);
        let starting_pos=graph.grid[start.x][start.y]
        let ending_pos=graph.grid[end.x][end.y]
        return astar.search(graph,starting_pos,ending_pos)
    }

    /**
     * 
     * @param {{x:number;y:number;} } start 
     * @param {{x: number; y: number;}} my_position 
     * @param {[{x:number; y:number; is_lost: boolean;}]} agent_positions
     */
    getAllReachable(start,my_position,agent_positions){
        let masked=this.getMaskedPathLayout(my_position,agent_positions)
        let reachability=[]
        for(let i=0;i<masked.length;i++){
            reachability.push(masked[i].map((v)=>{
                return v+this.getHeight()*this.getWidth()
            }))
        }
        let queue=[{x:start.x,y:start.y}]
        reachability[start.x][start.y] = 0
        while(!queue.length==0){
            let current=queue.shift()
            let current_weight=reachability[current.x][current.y]
            for(let shift of [{x:0,y:1},{x:1,y:0},{x:-1,y:0},{x:0,y:-1}]){
                let next={x:current.x+shift.x,y:current.y+shift.y}
                // if the next coordinate is inside the bounds of the map and is not an obstacle
                if(next.x>=0 && next.y>=0 && next.x<this.getWidth() && next.y<this.getHeight() && masked[next.x][next.y]!=0){
                    let next_weight = reachability[next.x][next.y]
                    if( next_weight > current_weight + 1 ){
                        reachability[next.x][next.y]=current_weight + 1
                        queue.push({x:next.x,y:next.y})
                    }
                }   
            }
        }
        for(let i=0;i<masked.length;i++){
            reachability[i]=reachability[i].map((v)=>{
                if(v >= this.getHeight()*this.getWidth()){
                    return -1
                }
                return v
            })
        }
        return reachability
    }
}


export {City_Map}