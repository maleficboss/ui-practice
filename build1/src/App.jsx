import ApprovalRow from "./ApprovalRow";
import Input from "./Input";
import { useEffect, useState } from "react";

function App(){
    const [revoke, setRevoke] = useState([]);
    const [paste, setPasted] = useState("");
    const [timer, setTimer] = useState(0)
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let ignore = false;

        async function loadApprovals(){
            try{
                const res = await fetch("http://localhost:3000/approvals");
                const data = await res.json();
                if(!ignore) setRevoke(data);
            } catch (err){
                if(!ignore) setError(err);
            } finally {
                if(!ignore) setLoading(false);
            }
        }

        loadApprovals();

        return () => {
            ignore = true;
        } 
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimer((previous) => previous + 1);
        }, 1000);
        
        return () =>{
         clearInterval(interval);}
    }, []);

    
    function handlePasted(e){
        /*destructure name and value to the what was typed
        and set pasted to the value */
        const {value} = e.target;
        setPasted(value);
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

    /*look through the mock array, for each row, check if the wallet pasted 
    exists*/
    const visibleRows = revoke.filter(rev => 
        rev.spender.toLowerCase().includes(paste.toLowerCase()) || rev.token.toLowerCase().includes(paste.toLowerCase())
    );
    
    return (
        <div>
            <Input value={paste} onPaste={handlePasted} />
            <p>Last scanned: {timer}s ago</p>

            {loading && <p>loading approvals...</p>}
            {error && <p>Wallet could not be scanned.</p>}
            {!loading && !error && revoke.length === 0 && <p>No approvals found.</p>}
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
                            {visibleRows.map((rev) => (
                                <ApprovalRow onRevoke={handleRevoke} revoked={rev.revoked}
                                    key={rev.id} id={rev.id} token={rev.token}
                                    spender={rev.spender} amount={rev.amount}
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