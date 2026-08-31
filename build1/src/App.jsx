import ApprovalRow from "./ApprovalRow";
import Input from "./Input";
import { useEffect, useState } from "react";
import { ethers } from "ethers";

function App(){
    const [revoke, setRevoke] = useState([]);
    const [paste, setPasted] = useState("");
    const [timer, setTimer] = useState(0)
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searched, setSearched] = useState(false);


    async function scan (e){
        e.preventDefault();
        // clear old data states
        setError(null);
        setRevoke([]);

        // check if it is a valid eth address
        if(!ethers.isAddress(paste)){
            setError("This is not a valid Eth address, the wallet must start with prefix '0x'!");
            return;
        }
        
        setLoading(true);

        try{
            const res = await fetch(`http://localhost:3000/approvals/${paste}`);
            const parsed = await res.json();
            // if fetch is successful
            if(res.ok){
                setRevoke(parsed.data);
                setTimer(0);
                setSearched(true);
            }else{
                setError(parsed.data || "Unable to get blockchain history.");
            }
        }
        catch (err){
            setError("Server down or connection timed out");
        } finally{
            setLoading(false);
        }
    }


    // timer
    useEffect(() => {
        const interval = setInterval(() => {
            setTimer((previous) => previous + 1);
        }, 1000);
        
        return () =>{
         clearInterval(interval);}
    }, []);

    
    function handleInputChange(e){
        /*destructure name and value to the what was typed
        and set pasted to the value */
        const {value} = e.target;
        setPasted(value);
        setSearched(false);
    }
    
    function handleRevoke(id){
        /*pass in the id of the wallet whose revoke button was clicked
        check if the id matches the paramter, take the amount of that row
        and set it to 0, then set revoked to true. 
        after that return input back to empty */
        setRevoke(revoke.map(rev => 
            rev.id === id ? {...rev, amount: "0", revoked: true} : rev
        ));
    }

    
    return (
        <div>
            <form onSubmit={scan}>
                <Input value={paste} onInputChange={handleInputChange} loading={loading}/>
            </form>
            
            <p>Last scanned: {timer}s ago</p>

            {loading && <p>loading approvals...</p>}
            {error && <p style={{color: "red", fontWeight: "bold"}}>{error}</p>}
            {!loading && !error && searched && revoke.length === 0 && paste &&  <p>No approvals found.</p>}
            {!loading && !error && revoke.length > 0 && (
                <div>
                    <table>
                        <thead>
                            <tr>
                                <th>Id</th>
                                <th>Amount</th>
                                <th>Token</th>
                                <th>Spender</th>
                                <th>Revoke Approval</th>
                            </tr>
                        </thead>
                        <tbody>
                            {revoke.map((rev) => (
                                <ApprovalRow onRevoke={handleRevoke} revoked={rev.revoked}
                                    isUnlimited={rev.isUnlimited} key={rev.id} id={rev.id} token={rev.token}
                                    spender={rev.spender} amount={rev.amount} decimals={rev.decimals}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
        </div>
    );
}

export default App;