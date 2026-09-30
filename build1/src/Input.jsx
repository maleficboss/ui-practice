import Bulb from "./Bulb";

function Input({onInputChange, value, loading, bulbOn, glassRef}){
    return(
        <div style={{ display: "flex", gap: "7px", alignItems: "center"}}>
            <input 
                name="wallet" value={value}
                placeholder="paste your wallet" onChange={(e) => onInputChange(e)}
                disabled={loading}
                style={{padding: "8px", width: "310px", position: "relative", zIndex: 1}}
            />
            {/* wrapper so the bulb is always centered above the button */}
            <div style={{ position: "relative", display: "flex" }}>
                <Bulb on={bulbOn} glassRef={glassRef} />
                <button 
                    type="submit" disabled={loading} style={{
                        position: "relative", zIndex: 1,
                        padding: "8px 15px", cursor: loading ? "not-allowed" : "pointer",
                        color: loading ? "#666666" : "#ffffff",
                        backgroundColor: loading ? "#cccccc" : "#0070f3", border: "none",
                        borderRadius: "4px", transition: "all 0.2s ease"
                    }}
                >
                    {loading ? "Scanning..." : "Scan wallet"}
                </button>
            </div>
        </div>   
    );
}

export default Input;