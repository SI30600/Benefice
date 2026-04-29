import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Calculator from "@/pages/Calculator";

function App() {
    return (
        <div className="App grain">
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Calculator />} />
                </Routes>
            </BrowserRouter>
        </div>
    );
}

export default App;
