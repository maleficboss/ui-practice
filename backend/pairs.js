import { ethers } from "ethers";

export function collectPairs(logs){
    const dedup = new Set();
    for(const log of logs){
        if(log.topics.length !== 3) continue; // ERC-721 Approval has 4 topics
        const token = ethers.getAddress(log.address);
        const spender = ethers.getAddress(ethers.dataSlice(log.topics[2], 12));
        dedup.add(`${token}-${spender}`);
    }
    return dedup;
}