import "dotenv/config";
import express from "express";
import cors from "cors";
import mock from "./list.js";
import { ethers } from "ethers";

const app = express();
const port = process.env.PORT || 3000; 
const rpc = process.env.RPC_URL;
// connect to eth node
const rpcProvider = new ethers.JsonRpcProvider(rpc);

app.use(cors({
    origin: 'http://127.0.0.1:5173'
}));

app.get("/approvals", (req, res) => {
    res.json(mock);
});

app.get("/approvals/:address", async (req, res) => {
    try{
        //get the user address from the search bar
        const userAddress = req.params.address;
        // hash the approval event: the owner, spender and value
        const approveEvent = ethers.id("Approval(address,address,uint256)");
        // pad the user address to base 32
        const padT032 = ethers.zeroPadValue(userAddress, 32);
        // filter logic to get the earliest and latest approval, then 
        // the approval name and owner address
        const logFilter = {
            fromBlock: "earliest",
            toBlock: "latest",
            topics: [
                approveEvent, padT032
            ]
        };
        const logs = await rpcProvider.getLogs(logFilter);
        res.status(200).json({success: true, data: logs});
    }
    catch (err){
        console.log(err);
        res.status(500).json({success: false, data: err.message});
    }
});

app.listen(port, () => {
    console.log(`Running on ${port}`);
});