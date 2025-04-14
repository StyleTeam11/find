import React from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="page">
      <h1>🏠 Home Page</h1>
      <button onClick={() => navigate("/profile")}>Go to sign up for account.</button>
    </div>
  );
};

export default Home;
