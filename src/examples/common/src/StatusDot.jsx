function StatusDot({ isActive }) {
    return (
    <div
        style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: isActive ? "red" : "lightgray",
            display: "inline-block",
            marginLeft: "10px",
            verticalAlign: "middle",
        }}
    />
)};

export default StatusDot;
