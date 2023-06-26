import * as constants  from "../../0_Common_Files/constants.js"
import { manhattan_distance } from "../../0_Common_Files/metrics.js";

class Synchronous_Parcels_DataBase{
    /**
     * @type {Map<string, {id: string; x: number; y: number; carriedBy: string; reward: number; last_seen: number; is_lost: boolean;}>}
     */
    database = new Map();
    /**
     * @type {[{id: string; x: number; y: number; carriedBy: string; reward: number;}]}
     */
    last_update = []

    /**
     * build a new synch parcel DB
    */
    constructor(){
        this.database=new Map()
    }

    /**
    * @param {[{id: string; x: number; y: number; carriedBy: string; reward: number;}]} parcels
    */
    updateParcelsData(parcels){
        this.last_update=parcels;
        let update_time=new Date().getTime()
        for(const parcel of parcels){
            if ( parcel.x % 1 != 0 || parcel.y % 1 != 0 ) continue;// skip buggy parcels
            parcel.last_seen=update_time;
            parcel.is_lost=false;
            this.database.set(parcel.id,parcel)
        }
    }

    /**
    * @param {{x: number; y: number;}} my_data
    */
    updateLostParcels(my_data){
        let update_ids=this.last_update.map( p=>p.id );
        for(let [id,data] of this.database){
            if( ! update_ids.includes(id)){
                if(manhattan_distance(my_data, data) <= constants.PARCEL_VIEW_DISTANCE){ // if a parcel I should be able to see has disappeared forget it
                    data.is_lost=true;
                }
            }
        }
    }

    /**
     * Merge this Parcel DB with another
     * @param {Synchronous_Parcels_DataBase} parcel_DB
     */
    merge_with(parcel_DB){
        for(let [id,data] of parcel_DB.database){
            if(! this.database.has(id)){//new parcel discovered
                this.database.set(id,data)
            }else{
                let knowledge=this.database.get(id)
                if(knowledge.last_seen < data.last_seen){// update with more recent data
                    knowledge.last_seen=data.last_seen
                    knowledge.x=data.x
                    knowledge.y=data.y
                    knowledge.carriedBy=data.carriedBy
                    knowledge.reward=data.reward
                    knowledge.is_lost=data.is_lost
                }
            }
        }
    }

    /**
     * @param {number} id
     * @returns {{id: string; x: number; y: number; carriedBy: string; reward: number;} | null}
     */
    getParcelFromId(id){
        if(! this.database.has(id)){
            return null;
        }
        const parcel = this.database.get(id)
        return parcel
    }

    /**
     * returns a list of all the parcels in the DB
     * @returns {[{id: string; x: number; y: number; carriedBy: string; reward: number;}]}
     */
    getAllParcels(){
        let acc=[]
        for(const [id,_data] of this.database){
            let parcel_data=this.getParcelFromId(id)
            if(parcel_data!==null){
                acc.push(structuredClone(parcel_data))
            } 
        }
        return acc;
    }

    /**
     * returns a list of all the parcel in the DB that are not lost
     * @returns {[{id: string; x: number; y: number; carriedBy: string; reward: number;}]}
     */
    getKnownParcels(){
        let p=this.getAllParcels()
        return p.filter(item=>!item.is_lost)
    }

    /**
     * @returns {[{id: string; x: number; y: number; carriedBy: string; reward: number;}]}
     */
    getFreeParcels(){
        let p=this.getKnownParcels()
        p=p.filter(item=>!item.carriedBy)
        return p;
    }

    /**
     * @param {{id:string;}} my_data
     * @returns {[{id: string;x: number;y: number;carriedBy: string;reward: number;}]}
     */
    getMyBag(my_data){
        let p=this.getKnownParcels()
        let filtered = p.filter(item=>(item.carriedBy===my_data.id))
        return filtered;
    }

    /**
     * @param {{id:string;}} my_id
     * @returns {[{id: string;x: number;y: number;carriedBy: string;reward: number;}]}
     */
    getMyBagFromId(my_id){
        let p=this.getKnownParcels()
        let filtered = p.filter(item=>(item.carriedBy===my_id))
        return filtered;
    }

    /**
     * @returns {[{id: string; x: number; y: number; reward: number; carriedBy: string;}]}
     */
    getLastUpdate(){
        return this.last_update
    }

    /**
     * @returns {[{key:string;value:{id: string; name: string; x: number; y: number; score: number; is_lost:bool; last_seen: number;}}]}
     */
    serialize(){
        let object=[]
        for(let [id,entry] of this.database){
            object.push({
                key: id,
                value: entry
            })
        }
        return object;
    }

    /**
     * @param {[{key:string;value:{id: string; x: number; y: number; carriedBy: string; reward: number; last_seen: number; is_lost: boolean;}}]} data
     * @returns {Synchronous_Parcels_DataBase}
     */
    deserialize(data){
        let db=new Synchronous_Parcels_DataBase()
        for(let object of data){
            db.database.set(object.key,object.value)
        }
        return db;
    }
}

export{ Synchronous_Parcels_DataBase }