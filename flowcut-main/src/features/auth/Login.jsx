import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { loginRequest, rateLimitMessage } from '../../api/authApi';
import { LOGIN_ROLES, validateEmail, validateLoginRole, validatePassword } from '../../validation/authValidation';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import styles from './Auth.module.css';

export default function Login() {
  const { setUser, homeFor } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function goToDestination(role) {
    navigate(homeFor(role), { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const nextErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
      role: validateLoginRole(role),
    };

    setErrors(nextErrors);
    setLoginError('');

    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);

    try {
      const { data } = await loginRequest({
        email,
        password,
        role,
      });

      console.log('[AUTH] LOGIN SUCCESS', data.user);

      setUser(data.user);

      console.log(
        '[AUTH] NAVIGATING TO',
        homeFor(data.user.role)
      );

      goToDestination(data.user.role);
    } catch (err) {
      if (err.status === 403 && err.fieldErrors?.email) {
        navigate('/verify-email', {
          state: { email, expiresAt: err.fieldErrors.otpExpiresAt },
        });
        return;
      }
      setErrors((current) => ({ ...current, ...(err.fieldErrors || {}) }));
      setLoginError(rateLimitMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>FLOWCUT</div>

        <h1 className={styles.title}>Log in</h1>

        <form onSubmit={handleSubmit} noValidate>
          <Input
            label="Gmail"
            type="email"
            name="email"
            placeholder="you@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />

          <div className={styles.selectField}>
            <label htmlFor="login-role">Account role</label>
            <select
              id="login-role"
              name="role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setErrors((current) => ({ ...current, role: null }));
                setLoginError('');
              }}
              aria-invalid={!!errors.role}
            >
              <option value="">Select your role</option>
              {LOGIN_ROLES.map((loginRole) => (
                <option key={loginRole} value={loginRole}>
                  {loginRole === 'shop_admin' ? 'Shop admin' : loginRole === 'super_admin' ? 'Super admin' : loginRole[0].toUpperCase() + loginRole.slice(1)}
                </option>
              ))}
            </select>
            {errors.role && <p className={styles.selectError}>{errors.role}</p>}
          </div>

          <Input
            label="Password"
            type="password"
            name="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />

          {loginError && <div className={styles.loginError} role="alert">{loginError}</div>}

          <Button
            type="submit"
            fullWidth
            disabled={submitting}
          >
            {submitting ? 'Logging in…' : 'Log in'}
          </Button>
        </form>

       <div className={styles.links}>
          <Link to="/forgot-password">
            Forgot password?
          </Link>

          <div className={styles.rightLinks}>
            <Link to="/register">
              Create an account
            </Link>

            <Link to="/">
              ← Go to Guest Mode
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}