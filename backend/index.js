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
// mini Abi for allowance
const miniAbi = [
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)"
]

app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"]
}));

app.get("/approvals", (req, res) => {
    res.json(mock);
});

app.get("/approvals/:address", async (req, res) => {
    try{
        // Phase 1
        const address = req.params.address;

        if(!ethers.isAddress(address)){
            return res.status(400).json({success: false, error: "Invalid address"});
        }
        const hash = ethers.id("Approval(address,address,uint256)");
        const padTo32 = ethers.zeroPadValue(address, 32);
        const latestBlock = await rpcProvider.getBlockNumber();
        
        // Phase 2
        const blockLimit = 300;
        const requestLimit = 10;
        const startFrom = Math.max(0, latestBlock - blockLimit);
        let allLogs = [];
        let currentToBlock = latestBlock;
        let currentFromBlock = Math.max(startFrom, currentToBlock - requestLimit + 1);

        // Phase 3
        while(currentToBlock >= startFrom){
            const filter = {
                fromBlock: currentFromBlock,
                toBlock: currentToBlock,
                topics: [
                    hash, padTo32
                ]
            }
            const logs = await rpcProvider.getLogs(filter);
            allLogs = [...allLogs, ...logs];
            currentToBlock = currentFromBlock - 1;
            currentFromBlock = Math.max(startFrom, currentToBlock - requestLimit + 1);
        }

        // Phase 4
        const dedup = new Set();
        for(const log of allLogs){
            const token = ethers.getAddress(log.address);
            const spender = ethers.getAddress(ethers.dataSlice(log.topics[2], 12));
            const concat = `${token}-${spender}`;
            dedup.add(concat);
        }

        // Phase 5
        const cache = new Map();
        const promise = [...dedup].map(async (concat) => {
            const [token, spender] = concat.split("-");
            let contract = cache.get(token);

            if(!contract) {
                contract = new ethers.Contract(token, miniAbi, rpcProvider);
                cache.set(token, contract);
            }

            const [amount, decimals] = await Promise.all([
                contract.allowance(address, spender),
                contract.decimals()
            ]);

            return {
                amount, decimals, token, spender
            }
        });
        const settleApproval = await Promise.all(promise);

        // Phase 6
        const maxUint256 = ethers.MaxUint256;
        const maxUint96 = (1n << 96n) - 1n;
        const approval = settleApproval
            .filter(approve => approve.amount > 0n)
            .map((approve, index) => {
                const isUnlimited = approve.amount === maxUint256 || approve.amount === maxUint96;
                return{
                    id: index + 1, isUnlimited, amount: approve.amount.toString(),
                    decimals: Number(approve.decimals), token: approve.token, spender: approve.spender,
                    revoked: false
                }
            });

        res.status(200).json({success: true, data: approval});
    }
    catch(error){
        console.error(error);
        if(error?.error?.code === 429){
            return res
                .set("Retry-After", "10")
                .status(429)
                .json({success: false, error: "The service is busy, try again in 10 seconds"});
        }

        res.status(500).json({success: false, error: "Something failed on our side"});
    }
});

app.listen(port, () => {
    console.log(`Running on ${port}`);
});