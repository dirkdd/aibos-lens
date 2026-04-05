import OverlayHeader from "./components/OverlayHeader";
import TranscriptFeed from "./components/TranscriptFeed";

function App() {
  return (
    <div className="overlay">
      <OverlayHeader />
      <div className="overlay-body">
        <TranscriptFeed />
      </div>
    </div>
  );
}

export default App;
