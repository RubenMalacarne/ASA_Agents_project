import { Intentions } from "./intentions.js"

/**
 * This class describes the beliefs about who the agents friend is and 
 * where it is and what he is doing
 */
class Friend_Beliefs{
    /**
     * @type {string}
     */
    id
    /**
     * @type {number}
     */
    x
    /**
     * @type {number}
     */
    y
    /**
     * @type {number}
     */
    score
    /**
     * @type {string}
     */
    name
    /**
     * @type {string}
     */
    protocol_status
    /**
     * @type {boolean}
     */
    finito
    /**
     * @type {Intentions} 
     */
    intentions

    /**
     * Build a new Friend Beliefs Object
     * @param {string} id 
     */
    constructor(id){
        this.id=id
        this.finito=false
        this.intentions=null
    }

    /**
     * Update the data of the friend agent
     * @param {Object} data 
     */
    on_update(data){
        this.id=data.id
        this.score=data.score
        this.x=Math.round(data.x)
        this.y=Math.round(data.y)
        this.name=data.name
    }
}
export{Friend_Beliefs}