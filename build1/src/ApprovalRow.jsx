import { ethers } from "ethers";

/*destructure all props passed from parent
token=token in question
spender=wallet that moved the funds
amount=amount allowed, wether 0, < unlimted or unlimted
id=id in the mock array
onRevoke=function that set allowance to 0
revoked=flag for checking if onRevoked has been called. t/f
*/
function ApprovalRow({token, spender, amount, id, onRevoke, revoked, isUnlimited, decimals, symbol}){
    //check if revoke has been set to true
    const isRevoked = revoked;

    const truncateAddress = (address) => {
        if(!address) return "";
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    const cleanSymbol = (clean) => {
        if(!clean) return null;
        return clean.length > 8 ? `${clean.slice(0, 8)}...`: clean;
    }

    const formattedAmount = (raw) => {
        if(decimals == null) return `${raw} (raw, decimals unknown)`;
        const num = parseFloat(ethers.formatUnits(raw, decimals));
        if(num > 0 && num < 0.0001) return "<0.0001";
        return num.toFixed(4);
    };

    const displaySymbol = cleanSymbol(symbol);
    const reducedTokenAddress = truncateAddress(token);
    const reducedSpenderAddress = truncateAddress(spender);
    
    return(
        <tr className={isUnlimited ? "unlimited" : ""}>
            <td>{id}</td>
            <td title={token}>
                {displaySymbol ? (
                    <span>
                        <strong>{displaySymbol}</strong> ({reducedTokenAddress})
                    </span>
                    ) : (
                        <span>{reducedTokenAddress}</span>
                    )
                }
            </td>
            <td>
                {isRevoked && <span style={{color:"gray"}}>Revoked</span>}
                {!isRevoked && (isUnlimited ? "Unlimited" : formattedAmount(amount))}
            </td>
            <td title={spender}>{reducedSpenderAddress}</td>
            <td><button onClick={() => onRevoke(id)} disabled={isRevoked}>
                    {isRevoked ? "Revoked" : "Revoke"}
                </button>
            </td>
        </tr>
    );
}

export default ApprovalRow;