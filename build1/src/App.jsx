import ApprovalRow from "./ApprovalRow";
import Input from "./Input";
import ChevronBackground from "./ChevronBackground";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ethers } from "ethers";

function App(){
    const [revoke, setRevoke] = useState([]);
    const [paste, setPasted] = useState("");
    const [timer, setTimer] = useState(0)
    // counts successful scans. 0 = nothing scanned yet: no "Last scanned" line, no timer running
    const [lastScan, setLastScan] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searched, setSearched] = useState(false);

    // scans = how many valid scans have been started, drives the chevron background
    const [scans, setScans] = useState(0);
    // viewport position of the bulb, the chevrons open from here
    const [origin, setOrigin] = useState({ x: 0, y: 0 });
    const glassRef = useRef(null);

    // bulb is on while the field holds a valid eth address (same check scan() uses)
    const bulbOn = ethers.isAddress(paste);

    function measureBulb(){
        const el = glassRef.current;
        if(!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    // keep the origin correct on load and when the window is resized
    useLayoutEffect(() => {
        function update(){
            const pos = measureBulb();
            if(pos) setOrigin(pos);
        }
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);


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

        // start the chevron reveal + one 3s spin (only for a real scan, not a rejected address)
        const pos = measureBulb();
        if(pos) setOrigin(pos);
        setScans((count) => count + 1);

        try{
            const res = await fetch(`http://localhost:3000/approvals/${paste}`);
            const parsed = await res.json();
            // if fetch is successful
            if(res.ok){
                setRevoke(parsed.data);
                setTimer(0);
                setLastScan((count) => count + 1); // first success starts the Last scanned timer
                setSearched(true);
            }else{
                setError(parsed.error || "Unable to get blockchain history.");
            }
        }
        catch (err){
            setError("Server down or connection timed out");
        } finally{
            setLoading(false);
        }
    }


    // timer: does nothing until a scan has succeeded, restarts on every new successful scan
    useEffect(() => {
        if(lastScan === 0) return;
        const interval = setInterval(() => {
            setTimer((previous) => previous + 1);
        }, 1000);
        
        return () =>{
         clearInterval(interval);}
    }, [lastScan]);

    
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

    const centered = { textAlign: "center" };

    return (
        <div style={{ position: "relative", minHeight: "100vh", color: "#e6e6e6" }}>
            <ChevronBackground scans={scans} origin={origin} />

            <div style={{
                position: "relative", zIndex: 2,
                display: "flex", flexDirection: "column", alignItems: "center",
                // pushes the form to the middle of the screen; the 140px floor leaves room for the bulb
                // the form keeps this position when results appear below it
                paddingTop: "max(140px, calc(50vh - 70px))",
                paddingBottom: "40px", paddingLeft: "15px", paddingRight: "15px"
            }}>
                <form onSubmit={scan}>
                    <Input value={paste} onInputChange={handleInputChange} loading={loading}
                        bulbOn={bulbOn} glassRef={glassRef}/>
                </form>
                
                {lastScan > 0 && <p style={centered}>Last scanned: {timer}s ago</p>}

                {loading && <p style={centered}>loading approvals...</p>}
                {error && <p style={{...centered, color: "red", fontWeight: "bold"}}>{error}</p>}
                {!loading && !error && searched && revoke.length === 0 && paste &&  <p style={centered}>No approvals found.</p>}
                {!loading && !error && revoke.length > 0 && (
                    // dark panel so the table stays readable over the chevrons
                    <div style={{
                        marginTop: "24px", padding: "16px", maxWidth: "100%", overflowX: "auto",
                        background: "rgba(0, 0, 0, 0.78)", borderRadius: "8px"
                    }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Id</th>
                                    <th>Token</th>
                                    <th>Amount</th>
                                    <th>Spender</th>
                                    <th>Revoke Approval</th>
                                </tr>
                            </thead>
                            <tbody>
                                {revoke.map((rev) => (
                                    <ApprovalRow onRevoke={handleRevoke} revoked={rev.revoked}
                                        isUnlimited={rev.isUnlimited} key={rev.id} id={rev.id} token={rev.token}
                                        spender={rev.spender} amount={rev.amount} decimals={rev.decimals} symbol={rev.symbol}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;