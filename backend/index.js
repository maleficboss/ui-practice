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
        // get the latest block number
        const lastestBlock = await rpcProvider.getBlockNumber();


        // look back 1 month starting from the latest block number
        const blockLimit = 300;
        const startFrom = Math.max(0, lastestBlock - blockLimit);
        // block per request limit
        const requestLimit = 10;
        let allLogs = [];
        // start again at the extreme end of the latest block
        let currentToBlock = lastestBlock;
        let currentFromBlock = Math.max(startFrom, currentToBlock - requestLimit + 1);

        
        while (currentToBlock >= startFrom) {
            // filter logic to get the earliest and latest approval, then 
            // the approval name and owner address
            const logFilter = {
                fromBlock: currentFromBlock,
                toBlock: currentToBlock,
                topics: [
                    approveEvent, padT032
                ]
            }

            const logs = await rpcProvider.getLogs(logFilter);
            allLogs = [...allLogs, ...logs];
            currentToBlock = currentFromBlock - 1;
            currentFromBlock = Math.max(startFrom, currentToBlock - blockLimit + 1);
        }
       
        res.status(200).json({success: true, data: allLogs});
    }
    catch (err){
        console.log(err);
        res.status(500).json({success: false, data: err.message});
    }
});

app.listen(port, () => {
    console.log(`Running on ${port}`);
});