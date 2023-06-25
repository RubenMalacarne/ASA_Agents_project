// valid on render
// let host = "https://deliveroojs.onrender.com";
    
// valid locally
import * as dotenv from "dotenv"
dotenv.config()

let host = process.env.HOST

// host = "http://10.196.22.185:8080"

export { host };