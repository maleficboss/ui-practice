import { ethers } from "ethers";

/*destructure all props passed from parent
token=token in question
spender=wallet that moved the funds
amount=amount allowed, wether 0, < unlimted or unlimted
id=id in the mock array
onRevoke=function that set allowance to 0
revoked=flag for checking if onRevoked has been called. t/f
*/
function ApprovalRow({token, spender, amount, id, onRevoke, revoked, isUnlimited}){
    //check if revoke has been set to true
    const isRevoked = revoked;

    const formttedAmount = (raw) => {
        try{
            const formatted = ethers.formatUnits(raw, 18);
            return parseFloat(formatted).toFixed(4);
        }catch(err){
            return raw;
        }
    }
    
    return(
        <tr className={isUnlimited ? "unlimited" : ""}>
            <td>{id}</td>
            <td>
                {isRevoked && <span style={{color:"gray"}}>Revoked</span>}
                {!isRevoked && (isUnlimited ? "Unlimited" : amount)}
            </td>
            <td>{token}</td>
            <td>{spender}</td>
            <td><button onClick={() => onRevoke(id)} disabled={isRevoked}>
                    {isRevoked ? "Revoked" : "Revoke"}
                </button>
            </td>
        </tr>
    );
}

export default ApprovalRow;