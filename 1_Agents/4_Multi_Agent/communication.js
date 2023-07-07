import { DeliverooApi } from  "@unitn-asa/deliveroo-js-client";
import * as constants from "../../0_Common_Files/constants.js"
import { cript_pass } from "../../0_Common_Files/metrics.js";
import { Agent } from "./multi_agent.js";


const PASSCODE = constants.PASSCODE
   
class Communication {

    /**
     * @type {Agent}
     */
    agent
    /**
     * @param {Agent} agent
     */
    constructor(agent){
        this.agent = agent
        /** @type {DeliverooApi} */
        this.client=agent.client
        this.list_id=[]
    }

    /**
     * Method that send (on broadcast) the kind value, id and passcode
     */
    async broadcast_msg(){
        console.log ("----Send_Message in Broadcast---")
        await this.client.shout({
            kind : "find_friends",
            content : {id : this.agent.my_id,
            passcode : 2468}
        });
    }
    
    /**
     * Method that compute a function, depends on the kind value
     */
    received_msg(){
        this.client.onMsg((id, name, msg, reply) => {           
            if (!msg.kind || !msg.content){
                return
            }
            switch(msg.kind){

                case "find_friends" : {  
                    
                    console.log("\n////////////////////new message received/////////////////////////////////\nof kind "+msg.kind)   
                    console.log("cercasi amico?")
                    this.check_passcode_add_id (id, name, msg.content, reply)  
                    break;}

                case "let-s_go"     :   
                
                    console.log("\n////////////////////new message received/////////////////////////////////\nof kind "+msg.kind)   
                    console.log("l'altro agente ha ricevuto il messaggio e sa il mio id")
                    if (!this.list_id.includes(msg.content.id)){
                        console.log("add new id")
                        this.list_id.push(msg.content.id)
                        this.agent.add_friend(msg.content.id)
                    }
                    break;
                
                case "finito"       :   {
                    
                    console.log("\n////////////////////new message received/////////////////////////////////\nof kind "+msg.kind)   
                    console.log("l'altro agente ha finito")
                    this.agent.on_finito(id)
                    break;}

                case "my_data"      : {  
                        this.agent.on_friend_update(msg.content)
                    break;}

                case "target_pos"   :  { console.log("l'altro agente ha inviato un possibile target_pos")
                    break;}
                
                case "ALL_Beliefs"  :   { 
                    this.agent.on_beliefs_update(msg.content)
                    break; }

                case "send_intentions":{console.log("l'altro agente ha inviato le sue intentions")
                        this.agent.on_intentions_shared(id,msg.content)
                    break; }

                case "plan"         :   {console.log("l'altro agente ha inviato il suo plan")
                    this.agent.on_multiplan(msg.content)
                    break;}

                default             :   {console.log ("altro")
                    break;}
            }
        
        });
        
    }

    

    /**
     * Method that check the passcode and decription it, include in the list the id_of the other agent ect.
     */
    async check_passcode_add_id (id, name, msg, reply){
        let answer = " "
            console.log("new msg received from", name+':' , "id:", id);
            
            if (msg.passcode == constants.PASSCODE){    
            //fase di decriptazione deve ritornarmi --> 1234
                if (cript_pass(msg.passcode)){
                //inserisco l'id del agent amico se non è ancora presente
                    if (!this.list_id.includes(id)){
                        console.log("add new id")
                        this.list_id.push(id)
                        this.agent.add_friend(id)
                    }else console.log("id has already been added added")
                    
                    answer = 'hello '+ name+', I am: '+this.client.name;
                    console.log("my answer: ", answer);
                    if (reply)
                    try { reply(answer) } catch { (error) => console.error(error) }
                }
                else{
                    console.log("XXXerror in DECRIPTION code")
                    answer = 'XXXerror fail passcode, you are not my friend';
                    console.log("my reply: ", answer);
                    if (reply)
                    try { reply(answer) } catch { (error) => console.error(error) }
                }
            }
            else {
                answer = 'XXXerror FAIL passcode, you are not my friend';
                console.log("my reply: ", answer);
                if (reply)
                try { reply(answer) } catch { (error) => console.error(error) }
            }  
            console.log(this.list_id)
            console.log("///////////////////////////////////////////////////////////////////////////////\n\n")
            for (var i=0 ; i<this.list_id.length; i++){
                if (this.list_id[i]== id)
                    console.log(this.list_id[i])
                this.client.say(this.list_id[i], {
                    kind   : "let-s_go",
                    content:{
                        answer : answer,
                        id     : this.agent.my_id
                    }
                })
            }
    }

//--------------------------------------------------------------------------------------------------------------
    //Methods to send the messages 
    //each function that send a messagie contai a "kind value to set the "SWITCH_POSSIBLE" value

    /**
     * method that send my data 
     * @send {"FINITO"}     
    * */
    async send_finito(id_friend,state_finito){
        if (state_finito ==true){
            console.log("agent has finished its plan")
            await this.client.say(id_friend, {
                kind    :   "finito",
                content:{value    :   state_finito}
                 })
        }else{
           return
        }
    }

    /**
     * method that send finito state
     * @send {position (x,y) ; name ; score of my bag}     
    * */
    async send_my_data(id_friend){
        await this.client.say(id_friend, {
            kind    :   "my_data",
            content:{
                x        :   this.agent.beliefs.my_data.x,
                y        :   this.agent.beliefs.my_data.y,
                name     :   this.agent.beliefs.my_data.name,
                score    :   this.agent.beliefs.my_data.score,
                id       :   this.agent.my_id
            }
        })
    }


    /**
     * method that send a position of a specific target
     * @send {position target (x,y)}
     */
    async send_target(id_friend,{x:x1, y:y1}){
        let goal_x = x1
        let goal_y = y1
        console.log (" send a the target_pos")
        await this.client.say(id_friend, {
            kind   :   "target_pos",
            content:{target  :   goal_x + "||" + goal_y }
        })
    }

    /**
     * method allow to send all of our belief of parcels
     * @send {list of parcels}
     */
    async send_all_beliefs (id_friend){
        let list_agents = this.agent.beliefs.agentDB.serialize()
        let list_parcels = this.agent.beliefs.parcelDB.serialize()
        await this.client.say(id_friend, {
            kind   :   "ALL_Beliefs",
            content:{
                parcels   :   list_parcels,
                agents   :   list_agents
            }
        })
    }

    /**
     * allow to send the nex move to another agents
     * @send {list of the possible plan}
     */
    async send_plan (id_friend,plan,time_to_exec){
        await this.client.say(id_friend, {
            kind    :   "plan",
            content:{
                plan    :   plan,
                timestamp: time_to_exec
            }
        })
    }


    /**
     * method that send a position of a specific target
     * @send {position target (x,y)}
     */
    async send_intentions(id_friend){
        //console.log(this.agent.intentions.intentions)
        await this.client.say(id_friend, {
            kind   :   "send_intentions",
            content  : {  intentions: this.agent.intentions}
        })
    }

}

export{Communication}