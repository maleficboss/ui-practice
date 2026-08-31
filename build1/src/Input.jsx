function Input({onInputChange, value, loading}){
    return(
        <div style={{ display: "flex", gap: "7px", alignItems: "center"}}>
            <input 
                name="wallet" value={value}
                placeholder="paste your wallet" onChange={(e) => onInputChange(e)}
                disabled={loading} style={{padding: "8px", width: "310px"}}
            />
            <button 
                type="submit" disabled={loading} style={{
                    padding: "8px 15px", cursor: loading ? "not-allowed" : "pointer",
                    color: loading ? "#666666" : "#ffffff",
                    backgroundColor: loading ? "#cccccc" : "#0070f3", border: "none",
                    borderRadius: "4px", transition: "all 0.2s ease"
                }}
            >
                {loading ? "Scanning..." : "Scan wallet"}
            </button>
        </div>   
    );
}

export default Input;