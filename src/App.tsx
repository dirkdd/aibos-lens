import OverlayHeader from "./components/OverlayHeader";

function App() {
  return (
    <div className="overlay">
      <OverlayHeader />
      <div className="overlay-body">
        <p className="text-zinc-400 text-sm p-4">Waiting for meeting...</p>
      </div>
    </div>
  );
}

export default App;
