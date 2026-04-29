import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Calculator from "@/pages/Calculator";
import LoginPage, { AuthLoading, useAuth } from "@/components/LoginPage";

function AppRoutes() {
    const { user, loading, error, login, logout } = useAuth();

    if (loading) return <AuthLoading />;
    if (!user) return <LoginPage onLogin={login} error={error} />;

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Calculator user={user} onLogout={logout} />} />
            </Routes>
        </BrowserRouter>
    );
}

function App() {
    return (
        <div className="App grain">
            <AppRoutes />
        </div>
    );
}

export default App;
