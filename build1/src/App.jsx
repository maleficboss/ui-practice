import ApprovalRow from "./ApprovalRow";
import Input from "./Input";
import ChevronBackground from "./ChevronBackground";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ethers } from "ethers";

function App(){
    // Phase 1: State
    // Everything the page has to remember between renders, in three groups:
    // the scan itself, the "Last scanned" timer, and the bulb/background animation.

    // scan: results, what is typed in the field, and the loading / error / searched flags
    const [revoke, setRevoke] = useState([]);
    const [paste, setPasted] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searched, setSearched] = useState(false);

    // timer
    const [timer, setTimer] = useState(0)
    // counts successful scans. 0 = nothing scanned yet: no "Last scanned" line, no timer running
    const [lastScan, setLastScan] = useState(0);

    // animation
    // scans = how many valid scans have been started, drives the chevron background
    const [scans, setScans] = useState(0);
    // viewport position of the bulb, the chevrons open from here
    const [origin, setOrigin] = useState({ x: 0, y: 0 });
    const glassRef = useRef(null);

    // onchain revoke flow
    const [scannedAddress, setScannedAddress] = useState("");
    const [account, setAccount] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [status, setStatus] = useState({});
    const [walletError, setWalletError] = useState("");

    // Phase 2: Values worked out from state
    // Recalculated on every render instead of being stored, so they can never go stale.

    // bulb is on while the field holds a valid eth address (same check scan() uses)
    const bulbOn = ethers.isAddress(paste);
    const centered = { textAlign: "center" };


    // Phase 3: Find the bulb on screen
    // measureBulb() reads where the bulb's glass sits in the viewport and returns its centre.
    // The layout effect runs it once on load and again on every resize,
    // so the chevron background always opens from the bulb.
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


    // Phase 4: Typing in the wallet field
    // Keeps the input controlled and resets "searched", so the
    // "No approvals found" message disappears as soon as the address is edited.
    function handleInputChange(e){
        /*destructure name and value to the what was typed
        and set pasted to the value */
        const {value} = e.target;
        setPasted(value);
        setSearched(false);
    }


    // Phase 5: Scan the wallet
    // Runs when the form is submitted. Clears the last result, rejects an invalid
    // address before any request is sent, starts the background spin, calls the
    // backend, then stores either the approvals or the error. finally always turns loading off.
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
                setScannedAddress(ethers.getAddress(paste));
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


    async function connectWallet(){
        console.log("connect called");
        setWalletError("");

        if(!window.ethereum) {
            setWalletError("No Evm wallet detected");
            return;
        }

        try{
            const browserProvider = new ethers.BrowserProvider(window.ethereum);
            const  accounts = await browserProvider.send("eth_requestAccounts", []);
            const network = await browserProvider.getNetwork();
            const id = Number(network.chainId);
            setChainId(id);
            
            if(accounts && accounts.length > 0){
                const normalised = ethers.getAddress(accounts[0]);
                setAccount(normalised);
            }
            
        }catch(error){
            console.error(error.code, error.message);
            if(error.code === "ACTION_REJECTED"){
                setWalletError("Connection was cancelled");
            }else{
                setWalletError("Couldn't connect to your wallet");
            }
        }
    }

    useEffect(() => {
        if(!window.ethereum) return;

        function accountsChanged(accounts){
            console.log("accountChanged:", accounts);
            if(!accounts || accounts.length === 0){
                setAccount(null);
            }else{
                const normalised = ethers.getAddress(accounts[0]);
                setAccount(normalised);
            }
        }

        function chainChanged(id){
            console.log("chainChanged:", id);

            const numericId = Number(id);
            setChainId(numericId);
        }

        window.ethereum.on("accountsChanged", accountsChanged);
        window.ethereum.on("chainChanged", chainChanged);

        return () => {
            window.ethereum.removeListener("accountsChanged", accountsChanged);
            window.ethereum.removeListener("chainChanged", chainChanged);
        }
        
    }, []);

    async function getRevokeBlocker(){
        if(!window.ethereum) return "no wallet found";

        try{
            const browserProvider = new ethers.BrowserProvider(window.ethereum);
            const  accounts = await browserProvider.send("eth_accounts", []);
            if(!accounts || accounts.length === 0){
                return "Connect your wallet";
            }

            const connectedAddress = ethereum.getAddress(accounts[0]);
            if(connectedAddress !== scannedAddress){
                return "Please, connect the same wallet scanned";
            }
        }catch(error){
            console.error(error.message);
            return "Failed to verify auth status";
        }

        return null;
    }

    // Phase 6: "Last scanned" timer
    // Does nothing until the first successful scan. Each new success changes lastScan,
    // which clears the old interval and starts a fresh one that counts up every second.

    // timer: does nothing until a scan has succeeded, restarts on every new successful scan
    useEffect(() => {
        if(lastScan === 0) return;
        const interval = setInterval(() => {
            setTimer((previous) => previous + 1);
        }, 1000);

        return () =>{
         clearInterval(interval);}
    }, [lastScan]);


    // Phase 7: Revoke 
    // Placeholder for the revoke flow. The old version only flipped a row to
    // "revoked" in local state; nothing was sent on-chain.

    function handleRevoke(id){
        getRevokeBlocker();
    }


    // Phase 8: Render
    // Draws the background, the heading and form (with the bulb), then the status line,
    // then exactly one of: loading, error, "no approvals" or the results table.
    return (
        <div style={{ position: "relative", minHeight: "100vh", color: "#e6e6e6" }}>
            {/* background: hidden until the first valid scan, then opens from the bulb */}
            <ChevronBackground scans={scans} origin={origin} />

            <div style={{
                position: "relative", zIndex: 2,
                display: "flex", flexDirection: "column", alignItems: "center",
                // pushes the form to the middle of the screen; the 140px floor leaves room for the bulb
                // the form keeps this position when results appear below it
                paddingTop: "max(140px, calc(50vh - 70px))",
                paddingBottom: "40px", paddingLeft: "15px", paddingRight: "15px"
            }}>
                {/* heading and form */}
                <h2>This tool can only look back an hour on eth sepolia (testnet chain)</h2>
                <button>Try mock data</button>
                <button onClick={connectWallet}>connect wallet</button>
                <form onSubmit={scan}>
                    <Input value={paste} onInputChange={handleInputChange} loading={loading}
                        bulbOn={bulbOn} glassRef={glassRef}/>
                </form>

                {/* status messages: only one of these shows at a time */}
                {lastScan > 0 && <p style={centered}>Last scanned: {timer}s ago</p>}

                {loading && <p style={centered}>loading approvals...</p>}
                {error && <p style={{...centered, color: "red", fontWeight: "bold"}}>{error}</p>}
                {!loading && !error && searched && revoke.length === 0 && paste &&  <p style={centered}>No approvals found in the last hour.</p>}

                {/* results table: one ApprovalRow per approval the backend returned */}
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
                                    <ApprovalRow onRevoke={handleRevoke} revoked={rev.revoked} onClick={connectWallet}
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