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
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"]
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
        const padTo32 = ethers.zeroPadValue(userAddress, 32);
        // get the latest block number
        const lastestBlock = await rpcProvider.getBlockNumber();


        // look back 1 hour for just 30 requests
        const blockLimit = 60; //300
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
                    approveEvent, padTo32
                ]
            }

            const logs = await rpcProvider.getLogs(logFilter);
            allLogs = [...allLogs, ...logs];

            currentToBlock = currentFromBlock - 1;
            currentFromBlock = Math.max(startFrom, currentToBlock - requestLimit + 1);
        }
        // store combined string
        const unique = new Set();

        for(const log of allLogs){
            // standared checksum address format
            const tokenAddress = ethers.getAddress(log.address);
            // unpad the spender address into a usable byto 20 address
            const clean = ethers.dataSlice(log.topics[2], 12);
            const spenderAddress = ethers.getAddress(clean);
            // crete a unique stiring with the token and spender together
            const stringKey = `${tokenAddress}-${spenderAddress}`;
            // add the unique string to the set
            unique.add(stringKey);
        }

        // new array with unique items 
        // spread the set into an array, map over it and pass in 
        // the item and index
        const uniqueApproval = [...unique].map((combined, index) => {
            const [token, spender] = combined.split("-");
            return{
                id: index + 1,
                amount: "Unlimited",
                token: token,
                spender: spender,
                revoked: false
            }
        });
       
        res.status(200).json({success: true, data: uniqueApproval});
    }
    catch (err){
        console.log(err);
        res.status(500).json({success: false, data: err.message});
    }
});

app.listen(port, () => {
    console.log(`Running on ${port}`);
});