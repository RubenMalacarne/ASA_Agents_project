const TIME_TO_LOAD=2000 //2 s
const MEMORY_SIZE_LIMIT=100;
// maximum numbers of tiles the agent can see from itself
const VIEW_DISTANCE=4;
const AGENTS_VIEW_DISTANCE=4;
const PARCEL_VIEW_DISTANCE=4;
// annotation to say that an agent was lost
const LOST = 'LOST';
// the available objectives when exploring the map
const EXPLORATION_OBJECTIVES=["center","n","s","e","w","ne","nw","se","sw"]

const SERVER_CLOCK_MILLISECONDS=50;
const PARCEL_DECAY_TIME_MILLISECONDS=1000;
const PARCEL_DECAY_RATE=SERVER_CLOCK_MILLISECONDS/PARCEL_DECAY_TIME_MILLISECONDS;
const TIME_FOR_ONE_ACTION=SERVER_CLOCK_MILLISECONDS;
// Friend client ID
//var ID_FRIEND = []
var ID_FRIEND = '37a9198f0ec'
var id_friends = []
const PASSCODE = '2468'
export{ TIME_TO_LOAD, MEMORY_SIZE_LIMIT, VIEW_DISTANCE, LOST, EXPLORATION_OBJECTIVES,ID_FRIEND,id_friends,PASSCODE, AGENTS_VIEW_DISTANCE, PARCEL_VIEW_DISTANCE, PARCEL_DECAY_RATE, TIME_FOR_ONE_ACTION}