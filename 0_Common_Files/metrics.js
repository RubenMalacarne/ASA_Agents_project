
/**
 * compute the Manhattan_distance to compute the distance between two points
 * @returns {{manhattan_distance: number;}}
*/
function manhattan_distance( {x:x1, y:y1}, {x:x2, y:y2}) {
    const dx = Math.abs( Math.round(x1) - Math.round(x2) )
    const dy = Math.abs( Math.round(y1) - Math.round(y2) )
    return dx + dy;
}

/**
 * compute the eucledian_distance to compute the distance between two points
 * @returns {{euclidean_distance: number;}}
*/
function euclidean_distance( {x:x1, y:y1}, {x:x2, y:y2}) {
    const dx = Math.abs( Math.round(x1) - Math.round(x2) )
    const dy = Math.abs( Math.round(y1) - Math.round(y2) )
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * function to gain the direction between two points
 * @returns {{direction: string;}}
*/
function get_direction({x:x1, y:y1}, {x:x2, y:y2}) {
    const dx = Math.round(x1) - Math.round(x2) 
    const dy = Math.round(y1) - Math.round(y2) 
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
 * function use to start the comunication, is a simple method check the possible friends
 * @returns {{boolean_value: boolean;}}
*/
function cript_pass (value){
    //decryption formula 
    let result = value/2
    if (result = 1234){
        return true
    }else return false

}

/**
 * function to check if a list is empty
 * @returns {{boolean_value: boolean;}}
*/
function isObjEmpty (obj) {
    return Object.values(obj).length === 0 && obj.constructor === Object;
}

export {manhattan_distance,get_direction,euclidean_distance,cript_pass,isObjEmpty}