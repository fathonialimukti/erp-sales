import { useNavigate } from "react-router";
import { Icon } from "../ui";
import { Button } from "../ui/Button";
import "./LandingPage.css";

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <div className="landing__inner">
        <div className="landing__badge">
          <Icon icon="solar:star-bold" />
          ERP SALES
        </div>
        <h1 className="landing__title">Sales Management System</h1>
        <p className="landing__desc">
          Manage your sales operations, track customers, and grow your business — all in one place.
        </p>
        <div className="landing__actions">
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate("/login")}
            leftIcon={<Icon icon="solar:login-3-linear" />}
          >
            Sign In
          </Button>
        </div>
      </div>
    </div>
  );
};
