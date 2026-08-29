import "dotenv/config";
import express from "express";
import cors from "cors";
import mock from "./list.js";
import { ethers } from "ethers";
import { Contract } from "ethers";

const app = express();
const port = process.env.PORT || 3000; 
const rpc = process.env.RPC_URL;
// connect to eth node
const rpcProvider = new ethers.JsonRpcProvider(rpc);
// mini Abi for allowance
const miniAbi = [
    "function allowance(address owner, address spender) view returns (uint256)"
]

app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"]
}));

app.get("/approvals", (req, res) => {
    res.json(mock);
});

app.get("/approvals/:address", async (req, res) => {
    try{
        /*Phase 1 */
        //get the user address from the search bar
        const userAddress = req.params.address;
        // hash the approval event: the owner, spender and value
        const approveEvent = ethers.id("Approval(address,address,uint256)");
        // pad the user address to base 32
        const padTo32 = ethers.zeroPadValue(userAddress, 32);
        // get the latest block number
        const lastestBlock = await rpcProvider.getBlockNumber();

        /*Phase 2 */
        // look back 1 hour for just 30 requests
        const blockLimit = 60; //300
        const startFrom = Math.max(0, lastestBlock - blockLimit);
        // block per request limit
        const requestLimit = 10;
        let allLogs = [];
        // start again at the extreme end of the latest block
        let currentToBlock = lastestBlock;
        let currentFromBlock = Math.max(startFrom, currentToBlock - requestLimit + 1);

        /*Phase 3 */
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

        /*Phase 4 */
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

        /*Phase 5 */
        const cache = new Map();
        // map uniques string to get aloowance promise
        const promise = [...unique].map(async (combined) => {
            const [tokenAddress, spenderAddress] = combined.split("-");
            // search for the contract in the cache first
            let tokenContract = cache.get(tokenAddress);
            // if !=exist, build it and cache it
            if(!tokenContract) {
                tokenContract = new ethers.Contract(tokenAddress, miniAbi, rpcProvider);
                cache.set(tokenAddress, tokenContract);
            }
            // call allowance function
            const bigInt = await tokenContract.allowance(userAddress, spenderAddress);

            return {
                amount: bigInt,
                token: tokenAddress,
                spender: spenderAddress,
                revoked: false
            }
        });
        // settle all the allowance rewuats asynchronously
        const settleApproval = await Promise.all(promise);

        /*Phase 6 */
        // standard infinite max number
        const MaxUint256 = ethers.MaxUint256;
        // hedge case
        const maxUint96 = (1n << 96n) - 1n;
        // check for 0 allowance and filter it out
        const activeApproval = settleApproval
            // delete all rows where allowance is zero
            .filter(approval => approval.amount > 0n)
            .map((approval, index) => {
                
                // check if the amount is unlimited
                const isUnlimited = approval.amount === MaxUint256 || approval.amount === maxUint96;
                return {
                    id: index + 1,
                    amount: approval.amount.toString(),
                    isUnlimited,
                    token: approval.token,
                    spender: approval.spender,
                    revoked: approval.revoked
                }
            });
       
        res.status(200).json({success: true, data: activeApproval});
    }
    catch (err){
        console.log(err);
        res.status(500).json({success: false, data: err.message});
    }
});

app.listen(port, () => {
    console.log(`Running on ${port}`);
});