import { ethers } from "ethers";

/*destructure all props passed from parent
token=token in question
spender=wallet that moved the funds
amount=amount allowed, wether 0, < unlimted or unlimted
id=id in the mock array
onRevoke=function that set allowance to 0
revoked=flag for checking if onRevoked has been called. t/f
*/
function ApprovalRow({token, spender, amount, id, onRevoke, isUnlimited, decimals, symbol, status}){
    // Phase 1: Revoked flag
    // Copies the revoked prop into a readable name used by the amount cell and the button.

    //check if revoke has been set to true
    const state = status?.state;
    const isRevoked = state === "revoked";


    let buttonText = "Revoke";
    let isButtonDisabled = false;

    switch (state) {
        case "awaiting-wallet":
            buttonText = "Confirm in wallet...";
            isButtonDisabled = true;
            break;
        case "confirming":
            buttonText = "Confirming...";
            isButtonDisabled = true;
            break;
        case "revoked":
            buttonText = "Revoked";
            isButtonDisabled = true;
            break;
        case "failed":
            buttonText = "Failed, retry";
            isButtonDisabled = false;
            break;
        default:
            buttonText = "Revoke";
            isButtonDisabled = false;
            break;
    }

    // Phase 2: Formatting helpers
    // truncateAddress shortens an address to 0x1234...abcd.
    // cleanSymbol cuts token symbols longer than 8 characters.
    // formattedAmount turns the raw on-chain number into a readable one using the token's
    // decimals, shows "<0.0001" for dust, and falls back to the raw number if decimals are unknown.
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


    // Phase 3: Prepare what the row shows
    // Runs the helpers once, before the JSX, so the markup below only reads finished values.
    const displaySymbol = cleanSymbol(symbol);
    const reducedTokenAddress = truncateAddress(token);
    const reducedSpenderAddress = truncateAddress(spender);


    // Phase 4: Render the row
    // Unlimited approvals get the "unlimited" class so they can be highlighted.
    // Cells: id, token (symbol if the contract has one, otherwise the short address),
    // amount (Revoked / Unlimited / formatted number), spender, and the revoke button.
    // Hovering the token or spender cell shows the full address.
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
            <td>
                <button onClick={() => onRevoke(id)} disabled={isButtonDisabled}>
                    {buttonText}
                </button>

                {status?.hash &&(
                    <a
                        href={`https://sepolia.etherscan.io/tx/${status.hash}`} target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: "12px", color: "#3b82f6", textDecoration: "underline", textAlign: "center" }}
                    >
                        View on Etherscan
                    </a>
                )}
            </td>
        </tr>
    );
}

export default ApprovalRow;