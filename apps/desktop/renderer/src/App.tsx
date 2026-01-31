export function App() {
  return (
    <div
      data-testid="app-shell"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        background: "#080808",
        color: "#ffffff",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 600 }}>CreoNow</div>
        <div style={{ marginTop: 8, opacity: 0.7, fontSize: 13 }}>
          Windows-first Workbench scaffold
        </div>
      </div>
    </div>
  );
}
